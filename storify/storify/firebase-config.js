// ===== Firebase Configuration =====
// Your Storify Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyBAAAJPPZjHsWD32nGXn5qTHuR5xYydhl4",
    authDomain: "storify-32f8b.firebaseapp.com",
    databaseURL: "https://storify-32f8b-default-rtdb.firebaseio.com",
    projectId: "storify-32f8b",
    storageBucket: "storify-32f8b.firebasestorage.app",
    messagingSenderId: "901334925398",
    appId: "1:901334925398:web:23f0939d2e378e99f5fbf7",
    measurementId: "G-9MJVBM2YKK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Auth
const auth = firebase.auth();

// Initialize Firestore
const db = firebase.firestore();

// Initialize Storage (for images)
const storage = firebase.storage();

// ===== Firebase Authentication Functions =====

/**
 * Create a new user account with email and password
 */
async function createUserWithEmail(email, password, username) {
    try {
        // Create user in Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // Update display name
        await user.updateProfile({
            displayName: username
        });
        
        // Save additional user data to Firestore
        await db.collection('users').doc(user.uid).set({
            username: username,
            email: email.toLowerCase(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            uid: user.uid
        });
        
        console.log('User created successfully:', username);
        return { success: true, user: user };
    } catch (error) {
        console.error('Error creating user:', error);
        return { success: false, error: error.message, code: error.code };
    }
}

/**
 * Sign in with email and password
 */
async function signInWithEmail(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('User signed in:', userCredential.user.displayName);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Error signing in:', error);
        return { success: false, error: error.message, code: error.code };
    }
}

/**
 * Sign in with username (looks up email first)
 */
async function signInWithUsername(username, password) {
    try {
        // Look up email by username in Firestore
        const usersSnapshot = await db.collection('users')
            .where('username', '==', username)
            .limit(1)
            .get();
        
        if (usersSnapshot.empty) {
            // Try lowercase
            const lowercaseSnapshot = await db.collection('users')
                .where('username', '==', username.toLowerCase())
                .limit(1)
                .get();
            
            if (lowercaseSnapshot.empty) {
                return { success: false, error: 'Account not found. Please sign up first.', code: 'auth/user-not-found' };
            }
            
            const userData = lowercaseSnapshot.docs[0].data();
            return await signInWithEmail(userData.email, password);
        }
        
        const userData = usersSnapshot.docs[0].data();
        return await signInWithEmail(userData.email, password);
    } catch (error) {
        console.error('Error signing in with username:', error);
        return { success: false, error: error.message, code: error.code };
    }
}

/**
 * Send password reset email
 */
async function sendPasswordReset(email) {
    try {
        await auth.sendPasswordResetEmail(email);
        console.log('Password reset email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Error sending password reset:', error);
        return { success: false, error: error.message, code: error.code };
    }
}

/**
 * Sign out current user
 */
async function signOutUser() {
    try {
        await auth.signOut();
        console.log('User signed out');
        return { success: true };
    } catch (error) {
        console.error('Error signing out:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get current authenticated user
 */
function getCurrentUser() {
    return auth.currentUser;
}

/**
 * Listen for auth state changes
 */
function onAuthStateChange(callback) {
    return auth.onAuthStateChanged(callback);
}

/**
 * Check if username is available
 */
async function isUsernameAvailable(username) {
    try {
        const snapshot = await db.collection('users')
            .where('username', '==', username.toLowerCase())
            .limit(1)
            .get();
        return snapshot.empty;
    } catch (error) {
        console.error('Error checking username:', error);
        return false;
    }
}

/**
 * Check if email is registered
 */
async function isEmailRegistered(email) {
    try {
        const methods = await auth.fetchSignInMethodsForEmail(email);
        return methods.length > 0;
    } catch (error) {
        console.error('Error checking email:', error);
        return false;
    }
}

// ===== Google Cloud Storage Functions =====

/**
 * Upload image to Google Cloud Storage and return the download URL
 * @param {string} userId - The user's UID
 * @param {string} imageDataUrl - Base64 data URL of the image
 * @param {string} storyId - Unique ID for the story/image
 * @returns {Promise<string>} - Download URL of the uploaded image
 */
async function uploadImageToStorage(userId, imageDataUrl, storyId) {
    try {
        // Convert base64 data URL to blob
        const response = await fetch(imageDataUrl);
        const blob = await response.blob();
        
        // Determine file extension from data URL
        let extension = 'jpg';
        if (imageDataUrl.includes('image/png')) {
            extension = 'png';
        } else if (imageDataUrl.includes('image/gif')) {
            extension = 'gif';
        } else if (imageDataUrl.includes('image/webp')) {
            extension = 'webp';
        }
        
        // Create storage reference with user-specific path
        const storageRef = storage.ref();
        const imagePath = `users/${userId}/stories/${storyId}.${extension}`;
        const imageRef = storageRef.child(imagePath);
        
        // Upload the image with metadata
        const metadata = {
            contentType: blob.type,
            customMetadata: {
                uploadedAt: new Date().toISOString(),
                storyId: storyId.toString()
            }
        };
        
        const snapshot = await imageRef.put(blob, metadata);
        
        // Get and return the download URL
        const downloadURL = await snapshot.ref.getDownloadURL();
        console.log('Image uploaded to Cloud Storage:', imagePath);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image to Cloud Storage:', error);
        // Return original data URL as fallback (will be stored in Firestore)
        return imageDataUrl;
    }
}

/**
 * Delete an image from Google Cloud Storage
 * @param {string} userId - The user's UID
 * @param {string} storyId - The story ID
 */
async function deleteImageFromStorage(userId, storyId) {
    try {
        const storageRef = storage.ref();
        
        // Try to delete common extensions
        const extensions = ['jpg', 'png', 'gif', 'webp'];
        
        for (const ext of extensions) {
            try {
                const imageRef = storageRef.child(`users/${userId}/stories/${storyId}.${ext}`);
                await imageRef.delete();
                console.log('Image deleted from Cloud Storage');
                return true;
            } catch (e) {
                // File with this extension doesn't exist, try next
            }
        }
        return false;
    } catch (error) {
        console.error('Error deleting image from Cloud Storage:', error);
        return false;
    }
}

/**
 * Upload multiple images and return their URLs
 */
async function uploadMultipleImages(userId, stories) {
    const updatedStories = [];
    
    for (const story of stories) {
        const updatedStory = { ...story };
        
        // Check if image is a data URL (not already uploaded)
        if (story.image && story.image.startsWith('data:')) {
            const imageUrl = await uploadImageToStorage(userId, story.image, story.id);
            updatedStory.image = imageUrl;
            updatedStory.imageUploaded = true;
        }
        
        updatedStories.push(updatedStory);
    }
    
    return updatedStories;
}

// ===== Firestore Data Functions =====

/**
 * Get user ID (uses Firebase Auth UID or falls back to username)
 */
function getUserId() {
    const user = auth.currentUser;
    return user ? user.uid : null;
}

/**
 * Save stories to Firestore (images stored in Cloud Storage)
 */
async function saveStoriesToFirestore(username, stories) {
    try {
        const userId = getUserId();
        if (!userId) {
            console.error('No authenticated user');
            return false;
        }
        
        // Upload any new images to Cloud Storage first
        const storiesWithUrls = await uploadMultipleImages(userId, stories);
        
        // Save story metadata to Firestore
        const userStoriesRef = db.collection('stories').doc(userId);
        
        const storiesData = {
            username: username.toLowerCase(),
            userId: userId,
            stories: storiesWithUrls,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await userStoriesRef.set(storiesData);
        console.log('Stories saved to Firestore for:', username);
        return true;
    } catch (error) {
        console.error('Error saving stories to Firestore:', error);
        return false;
    }
}

/**
 * Load stories from Firestore
 */
async function loadStoriesFromFirestore(username) {
    try {
        const userId = getUserId();
        if (!userId) {
            console.log('No authenticated user, cannot load from Firestore');
            return [];
        }
        
        const doc = await db.collection('stories').doc(userId).get();
        if (doc.exists) {
            const data = doc.data();
            console.log('Stories loaded from Firestore:', data.stories?.length || 0);
            return data.stories || [];
        }
        return [];
    } catch (error) {
        console.error('Error loading stories from Firestore:', error);
        return [];
    }
}

/**
 * Save drafts to Firestore
 */
async function saveDraftsToFirestore(username, drafts) {
    try {
        const userId = getUserId();
        if (!userId) {
            console.error('No authenticated user');
            return false;
        }
        
        // Upload any new images in drafts to Cloud Storage
        const updatedDrafts = [];
        for (const draft of drafts) {
            const updatedDraft = { ...draft };
            if (draft.stories) {
                updatedDraft.stories = await uploadMultipleImages(userId, draft.stories);
            }
            updatedDrafts.push(updatedDraft);
        }
        
        const userDraftsRef = db.collection('drafts').doc(userId);
        
        const draftsData = {
            username: username.toLowerCase(),
            userId: userId,
            drafts: updatedDrafts,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        await userDraftsRef.set(draftsData);
        console.log('Drafts saved to Firestore for:', username);
        return true;
    } catch (error) {
        console.error('Error saving drafts to Firestore:', error);
        return false;
    }
}

/**
 * Load drafts from Firestore
 */
async function loadDraftsFromFirestore(username) {
    try {
        const userId = getUserId();
        if (!userId) {
            return [];
        }
        
        const doc = await db.collection('drafts').doc(userId).get();
        if (doc.exists) {
            const data = doc.data();
            console.log('Drafts loaded from Firestore:', data.drafts?.length || 0);
            return data.drafts || [];
        }
        return [];
    } catch (error) {
        console.error('Error loading drafts from Firestore:', error);
        return [];
    }
}

/**
 * Save story title to Firestore
 */
async function saveStoryTitleToFirestore(username, title) {
    try {
        const userId = getUserId();
        if (!userId) return false;
        
        const userStoriesRef = db.collection('stories').doc(userId);
        await userStoriesRef.set({ title: title }, { merge: true });
        console.log('Story title saved to Firestore');
        return true;
    } catch (error) {
        console.error('Error saving story title to Firestore:', error);
        return false;
    }
}

/**
 * Load story title from Firestore
 */
async function loadStoryTitleFromFirestore(username) {
    try {
        const userId = getUserId();
        if (!userId) return '';
        
        const doc = await db.collection('stories').doc(userId).get();
        if (doc.exists) {
            return doc.data().title || '';
        }
        return '';
    } catch (error) {
        console.error('Error loading story title from Firestore:', error);
        return '';
    }
}

/**
 * Delete a story and its image
 */
async function deleteStoryFromFirestore(username, storyId) {
    try {
        const userId = getUserId();
        if (!userId) return false;
        
        // Delete image from Cloud Storage
        await deleteImageFromStorage(userId, storyId);
        
        return true;
    } catch (error) {
        console.error('Error deleting story:', error);
        return false;
    }
}

/**
 * Sync local data to Firestore (for migration from localStorage)
 */
async function syncLocalDataToFirestore(username) {
    try {
        const userId = getUserId();
        if (!userId) {
            console.log('No authenticated user, skipping sync');
            return false;
        }
        
        // Check if user has local stories that need to be synced
        const localStoriesKey = 'storifyStories_' + username;
        const localStories = localStorage.getItem(localStoriesKey);
        
        if (localStories) {
            const stories = JSON.parse(localStories);
            if (stories.length > 0) {
                // Check if Firestore already has stories
                const firestoreStories = await loadStoriesFromFirestore(username);
                if (firestoreStories.length === 0) {
                    // Sync local stories to Firestore (this will also upload images)
                    await saveStoriesToFirestore(username, stories);
                    console.log('Local stories synced to Firestore with images');
                }
            }
        }
        
        // Sync drafts
        const localDraftsKey = 'storifyDrafts_' + username;
        const localDrafts = localStorage.getItem(localDraftsKey);
        
        if (localDrafts) {
            const drafts = JSON.parse(localDrafts);
            if (drafts.length > 0) {
                const firestoreDrafts = await loadDraftsFromFirestore(username);
                if (firestoreDrafts.length === 0) {
                    await saveDraftsToFirestore(username, drafts);
                    console.log('Local drafts synced to Firestore');
                }
            }
        }
        
        // Sync title
        const localTitleKey = 'storifyTitle_' + username;
        const localTitle = localStorage.getItem(localTitleKey);
        
        if (localTitle) {
            const firestoreTitle = await loadStoryTitleFromFirestore(username);
            if (!firestoreTitle) {
                await saveStoryTitleToFirestore(username, localTitle);
                console.log('Local title synced to Firestore');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error syncing local data to Firestore:', error);
        return false;
    }
}

// Legacy compatibility functions (for backwards compatibility with existing code)
async function userExistsInFirestore(username) {
    return !(await isUsernameAvailable(username));
}

async function emailExistsInFirestore(email) {
    return await isEmailRegistered(email);
}

async function saveUserToFirestore(userData) {
    // This is now handled by createUserWithEmail
    return true;
}

async function getUserFromFirestore(username) {
    try {
        const snapshot = await db.collection('users')
            .where('username', '==', username.toLowerCase())
            .limit(1)
            .get();
        
        if (!snapshot.empty) {
            return snapshot.docs[0].data();
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

console.log('Firebase initialized with Auth, Firestore, and Cloud Storage!');
