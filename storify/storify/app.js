// ===== Storify App with ElevenLabs Integration =====

// DOM Elements
const loginPage = document.getElementById('loginPage');
const storyPage = document.getElementById('storyPage');
const loginForm = document.getElementById('loginForm');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const welcomeUser = document.getElementById('welcomeUser');
const logoutBtn = document.getElementById('logoutBtn');

// Auth DOM Elements
const signupForm = document.getElementById('signupForm');
const signupLink = document.getElementById('signupLink');
const authSubtitle = document.getElementById('authSubtitle');
const authToggleText = document.getElementById('authToggleText');
const loginError = document.getElementById('loginError');
const signupError = document.getElementById('signupError');
const signupSuccess = document.getElementById('signupSuccess');
const signupUsername = document.getElementById('signupUsername');
const signupEmail = document.getElementById('signupEmail');
const signupPassword = document.getElementById('signupPassword');
const signupConfirmPassword = document.getElementById('signupConfirmPassword');
const reqLength = document.getElementById('reqLength');
const reqMatch = document.getElementById('reqMatch');

// Forgot Password DOM Elements
const forgotPasswordForm = document.getElementById('forgotPasswordForm');
const forgotPasswordLink = document.getElementById('forgotPasswordLink');
const forgotPasswordText = document.getElementById('forgotPasswordText');
const forgotEmail = document.getElementById('forgotEmail');
const forgotError = document.getElementById('forgotError');
const forgotSuccess = document.getElementById('forgotSuccess');

const uploadModal = document.getElementById('uploadModal');
const storyDetailModal = document.getElementById('storyDetailModal');
const addStoryBtn = document.getElementById('addStoryBtn');
const closeModal = document.getElementById('closeModal');
const closeDetailModal = document.getElementById('closeDetailModal');
const uploadArea = document.getElementById('uploadArea');
const imageInput = document.getElementById('imageInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreview = document.getElementById('imagePreview');
const imageNote = document.getElementById('imageNote');
const cancelUpload = document.getElementById('cancelUpload');
const saveStory = document.getElementById('saveStory');

const storyPoints = document.getElementById('storyPoints');
const storyTitle = document.getElementById('storyTitle');
const narrationPanel = document.getElementById('narrationPanel');
const narrationContent = document.getElementById('narrationContent');
const closeNarration = document.getElementById('closeNarration');
const playNarration = document.getElementById('playNarration');
const stopNarration = document.getElementById('stopNarration');

const detailImage = document.getElementById('detailImage');
const detailChapter = document.getElementById('detailChapter');
const detailNote = document.getElementById('detailNote');
const detailNoteEdit = document.getElementById('detailNoteEdit');
const editNoteBtn = document.getElementById('editNoteBtn');
const noteSaveActions = document.getElementById('noteSaveActions');
const cancelNoteEdit = document.getElementById('cancelNoteEdit');
const saveNoteEdit = document.getElementById('saveNoteEdit');
const aiNarration = document.getElementById('aiNarration');
const regenerateStory = document.getElementById('regenerateStory');
const deletePhotoBtn = document.getElementById('deletePhoto');
const replacePhotoBtn = document.getElementById('replacePhoto');

// Drafts DOM Elements
const draftsBtn = document.getElementById('draftsBtn');
const draftsModal = document.getElementById('draftsModal');
const closeDraftsModal = document.getElementById('closeDraftsModal');
const saveAsDraft = document.getElementById('saveAsDraft');
const startNewStory = document.getElementById('startNewStory');
const draftsList = document.getElementById('draftsList');

// API Configuration - loaded from api-config.js (gitignored)
const ELEVENLABS_VOICE_ID = API_CONFIG?.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
const ELEVENLABS_API_KEY = API_CONFIG?.ELEVENLABS_API_KEY || '';
const OPENAI_API_KEY = API_CONFIG?.OPENAI_API_KEY || '';

// App State
let currentUser = null;
let stories = [];
let drafts = []; // Array to store saved drafts
let currentStoryIndex = null;
let selectedImage = null;
let narrationStartChapter = 0; // Which chapter to start narration from
let selectedFilename = null;
let elevenLabsApiKey = ELEVENLABS_API_KEY;
let currentAudio = null;
let isNarrationPaused = false;
let currentTheme = localStorage.getItem('storifyTheme') || 'mountain';
let isSignupMode = false; // Track auth mode
let isForgotMode = false; // Track forgot password mode

// Theme configurations based on image colors
const themes = {
    mountain: {
        name: 'Mountain Twilight',
        gradient: 'linear-gradient(180deg, #0f0c29 0%, #1a1a3e 10%, #2d2d5a 20%, #3d4a6b 35%, #5a7a8a 50%, #8fa5a3 65%, #c9b896 82%, #d4a574 92%, #c9956a 100%)',
        mountainColor1: '#1a2a3a',
        mountainColor2: '#243447',
        mountainColor3: '#1f3040',
        treeColor: '#1a3a2a',
        groundColor: 'linear-gradient(180deg, #8fa07a 0%, #7a9068 30%, #6b8058 60%, #5c7048 100%)'
    },
    beach: {
        name: 'Ocean Breeze',
        gradient: 'linear-gradient(180deg, #87CEEB 0%, #98D8E8 15%, #B0E0E6 30%, #E0F4F8 50%, #F5DEB3 70%, #DEB887 85%, #D2B48C 100%)',
        mountainColor1: '#5F9EA0',
        mountainColor2: '#4682B4',
        mountainColor3: '#6B8E9F',
        treeColor: '#2E8B57',
        groundColor: 'linear-gradient(180deg, #F5DEB3 0%, #DEB887 50%, #D2B48C 100%)'
    },
    sunset: {
        name: 'Golden Sunset',
        gradient: 'linear-gradient(180deg, #1a1a2e 0%, #2d1b4e 10%, #4a2c5a 20%, #6b3a5c 30%, #8b475d 40%, #c76b6b 55%, #e8956a 70%, #f4b183 85%, #ffd194 100%)',
        mountainColor1: '#3d2852',
        mountainColor2: '#4a3060',
        mountainColor3: '#5a3a68',
        treeColor: '#2a1a3a',
        groundColor: 'linear-gradient(180deg, #c9a87c 0%, #d4a574 50%, #c9956a 100%)'
    },
    forest: {
        name: 'Enchanted Forest',
        gradient: 'linear-gradient(180deg, #0a1a0a 0%, #1a2f1a 15%, #2a4a2a 30%, #3a5a3a 45%, #4a7a4a 60%, #6a9a6a 75%, #8aba8a 90%, #a5cfa5 100%)',
        mountainColor1: '#1a3a2a',
        mountainColor2: '#2a4a3a',
        mountainColor3: '#1f4030',
        treeColor: '#0f2f1f',
        groundColor: 'linear-gradient(180deg, #4a7a4a 0%, #3a6a3a 50%, #2a5a2a 100%)'
    },
    night: {
        name: 'Starry Night',
        gradient: 'linear-gradient(180deg, #0a0a1a 0%, #0f0f2a 20%, #1a1a3a 40%, #252545 60%, #303050 80%, #404060 100%)',
        mountainColor1: '#151525',
        mountainColor2: '#1a1a30',
        mountainColor3: '#12122a',
        treeColor: '#0a0a1a',
        groundColor: 'linear-gradient(180deg, #2a2a4a 0%, #252540 50%, #1a1a35 100%)'
    },
    winter: {
        name: 'Winter Wonderland',
        gradient: 'linear-gradient(180deg, #a8c8dc 0%, #b8d4e8 15%, #c8e0f0 30%, #d8ecf8 50%, #e8f4fc 70%, #f0f8ff 85%, #ffffff 100%)',
        mountainColor1: '#7a9ab0',
        mountainColor2: '#8aaac0',
        mountainColor3: '#6a8aa0',
        treeColor: '#2a4a3a',
        groundColor: 'linear-gradient(180deg, #f0f8ff 0%, #e8f4fc 50%, #ffffff 100%)'
    },
    desert: {
        name: 'Desert Dunes',
        gradient: 'linear-gradient(180deg, #1a1a2e 0%, #3d2b1f 15%, #5c4033 30%, #8b6914 45%, #c9a227 60%, #daa520 75%, #f4a460 90%, #ffd27f 100%)',
        mountainColor1: '#8b6914',
        mountainColor2: '#9b7924',
        mountainColor3: '#7b5904',
        treeColor: '#5c4033',
        groundColor: 'linear-gradient(180deg, #daa520 0%, #d2b48c 50%, #c9a227 100%)'
    }
};

// ULTRA-HUMAN story templates - natural speech without stage directions
// Context-aware narration patterns based on detected themes in notes
const emotionalPatterns = {
    // Joy/Happiness indicators
    joy: {
        keywords: ['happy', 'joy', 'smile', 'laugh', 'fun', 'amazing', 'wonderful', 'best', 'love', 'excited', 'celebrate', 'party', 'birthday', 'wedding', 'graduation', 'achievement', 'success', 'win', 'won', 'proud', 'awesome', 'fantastic', 'incredible', 'great', 'beautiful', 'perfect', 'blessed', 'grateful', 'thankful'],
        expressions: [
            "Oh my gosh, this one... {note}. I just— I can't help but smile every single time I look at this. It's like pure happiness captured in a single frame.",
            "Okay so... {note}. And honestly? My heart still does a little happy dance whenever I think about this moment. It was just... everything.",
            "This right here? {note}. The kind of joy you see in this photo? That's the real, unfiltered stuff. No staging. Just genuine happiness.",
            "I'm grinning just looking at this one. {note}. These are the moments that make life so incredibly worth living, you know?",
            "So this is where {note}. And let me tell you, the energy in this moment? Absolutely contagious. Everyone was just so... alive."
        ]
    },
    // Sadness/Loss indicators  
    sadness: {
        keywords: ['miss', 'sad', 'goodbye', 'farewell', 'last', 'final', 'lost', 'gone', 'passed', 'memorial', 'remember', 'memory', 'never forget', 'crying', 'tears', 'hard', 'difficult', 'tough', 'struggle', 'pain', 'hurt', 'broken', 'end', 'leaving', 'moved away'],
        expressions: [
            "This one's... this one's a little harder to talk about. {note}. But you know what? Even the bittersweet moments deserve to be remembered. They shaped who we are.",
            "I take a deep breath every time I see this. {note}. Some moments carry a weight that never quite lifts... but that weight means it mattered.",
            "So... {note}. Not every chapter is easy to revisit. But I think that's what makes them so important to hold onto.",
            "This photo holds something fragile. {note}. And even though it stings a little... I wouldn't trade this memory for anything.",
            "I won't lie, this one gets me every time. {note}. But there's beauty in that, isn't there? In feeling things so deeply?"
        ]
    },
    // Love/Romance indicators
    love: {
        keywords: ['love', 'heart', 'together', 'couple', 'kiss', 'hug', 'cuddle', 'romantic', 'date', 'anniversary', 'valentine', 'wedding', 'engaged', 'proposal', 'soulmate', 'partner', 'husband', 'wife', 'boyfriend', 'girlfriend', 'forever', 'always', 'us', 'we'],
        expressions: [
            "Oh, this one... {note}. You can literally see the love just radiating from this photo. It's almost too pure for words.",
            "My heart just— it just melts looking at this. {note}. This is what it's all about, isn't it? These connections that make everything else fade away.",
            "So here we have {note}. And if this doesn't make you believe in love... I don't know what will. Just look at this.",
            "This moment right here? {note}. It's like the whole world stopped just for a second... and it was just us. Just this.",
            "I get butterflies just looking at this one. {note}. Some moments capture something that words can never fully do justice to."
        ]
    },
    // Adventure/Excitement indicators
    adventure: {
        keywords: ['adventure', 'travel', 'trip', 'journey', 'explore', 'discover', 'new', 'first time', 'exciting', 'thrill', 'mountain', 'beach', 'ocean', 'nature', 'hike', 'climb', 'road trip', 'vacation', 'holiday', 'abroad', 'foreign', 'destination', 'bucket list', 'dream'],
        expressions: [
            "Oh man, buckle up for this one. {note}. This was the moment where everything became an adventure. Pure adrenaline and wonder.",
            "So there I was... {note}. You know those moments where you feel so incredibly alive? Like every cell in your body is just buzzing? Yeah. This was that.",
            "This photo doesn't even begin to capture the energy of this moment. {note}. It was wild. In the best possible way.",
            "Here's where the magic happened. {note}. Some places just... they grab your soul and don't let go. This was definitely one of them.",
            "I can still feel the wind, smell the air, hear the sounds. {note}. Adventures like this? They change you. In ways you don't even realize until later."
        ]
    },
    // Family indicators
    family: {
        keywords: ['family', 'mom', 'dad', 'mother', 'father', 'parent', 'sibling', 'brother', 'sister', 'grandma', 'grandpa', 'grandmother', 'grandfather', 'aunt', 'uncle', 'cousin', 'nephew', 'niece', 'son', 'daughter', 'baby', 'kid', 'child', 'children', 'home', 'reunion', 'holiday', 'christmas', 'thanksgiving', 'generation'],
        expressions: [
            "Family moments like this? {note}. They're the glue that holds everything together. The foundation of everything we are.",
            "This one hits different. {note}. Because family? Family is where your story really begins. Every chapter connects back to moments like this.",
            "Oh, the love in this photo. {note}. You can feel it, can't you? That unbreakable bond that just... exists. No questions asked.",
            "Looking at this makes me feel so grounded. {note}. These are the people who know you. Really know you. And love you anyway.",
            "There's something sacred about this moment. {note}. Family gathered, hearts full. This is what life is really about."
        ]
    },
    // Friends indicators
    friends: {
        keywords: ['friend', 'friends', 'bestie', 'best friend', 'bff', 'crew', 'squad', 'gang', 'group', 'hangout', 'party', 'night out', 'reunion', 'college', 'school', 'classmate', 'roommate', 'buddy', 'pal', 'memories', 'crazy', 'wild'],
        expressions: [
            "The crew! {note}. These are the people who turn ordinary moments into absolutely legendary memories. What would I even do without them?",
            "Okay so... {note}. And let me just say, the stories from this moment? Absolutely cannot be repeated. But in the best way.",
            "This right here is friendship in its purest form. {note}. The kind of bond that doesn't need constant contact to stay strong.",
            "I'm laughing just looking at this. {note}. Friends like these? They're not just friends. They're the family you choose.",
            "Oh, the chaos and beauty of this moment. {note}. Some people just get you. These people? They get me. Completely."
        ]
    },
    // Achievement/Pride indicators
    achievement: {
        keywords: ['proud', 'achievement', 'accomplished', 'did it', 'made it', 'success', 'successful', 'graduate', 'graduation', 'degree', 'diploma', 'promotion', 'new job', 'first', 'milestone', 'goal', 'dream come true', 'hard work', 'paid off', 'finally', 'deserve'],
        expressions: [
            "This moment? {note}. All the blood, sweat, and tears led to THIS. And let me tell you, it was worth every single second.",
            "I still can't believe this actually happened. {note}. When hard work meets opportunity... magic happens. Real, tangible magic.",
            "Look at this. Just... look at this. {note}. This is what dreams look like when they finally come true. I'm so proud.",
            "This photo represents so much more than what you see. {note}. It represents every late night, every doubt pushed aside, every moment of believing.",
            "All the 'you can do its' and 'keep goings' led here. {note}. This is proof that persistence pays off. Always."
        ]
    },
    // Peaceful/Calm indicators
    peaceful: {
        keywords: ['peace', 'peaceful', 'calm', 'quiet', 'serene', 'relax', 'relaxing', 'chill', 'sunset', 'sunrise', 'morning', 'evening', 'nature', 'alone', 'solitude', 'meditation', 'reflect', 'breathe', 'slow', 'simple', 'still', 'tranquil'],
        expressions: [
            "This moment was pure stillness. {note}. Sometimes the quietest moments speak the loudest, you know?",
            "I can feel the peace radiating from this photo. {note}. In a world that's constantly moving... moments like this are everything.",
            "Just... breathe. That's what this photo says to me. {note}. A gentle reminder that it's okay to slow down.",
            "There's something deeply healing about this. {note}. Like the universe just said 'here, take a moment. Just be.'",
            "This captures exactly what my soul needed. {note}. Peace. Pure, uninterrupted, beautiful peace."
        ]
    },
    // Food/Celebration indicators
    food: {
        keywords: ['food', 'eat', 'eating', 'delicious', 'yummy', 'tasty', 'restaurant', 'dinner', 'lunch', 'breakfast', 'meal', 'cook', 'cooking', 'bake', 'baking', 'feast', 'drink', 'coffee', 'wine', 'dessert', 'cake', 'treat'],
        expressions: [
            "Oh. My. Goodness. {note}. I can practically taste this moment just looking at the photo. So. Good.",
            "Food is love, and this proves it. {note}. Some moments are just meant to be savored... slowly. Deliciously.",
            "This meal was an experience. {note}. Because it's never just about the food, right? It's about the moment. The company. The vibes.",
            "I'm getting hungry just looking at this. {note}. The best memories always seem to involve good food somehow, don't they?",
            "Feast for the eyes and the soul. {note}. Moments like this remind me that the simple pleasures? They're actually the biggest ones."
        ]
    },
    // Default/General (when no specific emotion is detected)
    general: {
        expressions: [
            "So... the journey continues here, where {note}. And honestly? It was one of those moments that just stays with you. Not because anything dramatic happened... but because everything felt exactly right.",
            "And then— then there was this. {note}. You ever have one of those moments that just etches itself into your heart? Like, permanently? Yeah. This was definitely one of them.",
            "This moment right here? {note}. There's something kind of magical about these unplanned moments, isn't there? Like life just knew exactly what it was doing.",
            "Here's a little secret this photo holds... {note}. You know, some stories don't need many words. They just live there, in the space between a glance and a smile.",
            "What can I even say about this moment? {note}. It's funny, isn't it? How the best chapters of our lives often write themselves when we're not even paying attention.",
            "I remember this so, so clearly. {note}. It's the kind of moment you wish you could just bottle up and keep forever, you know?",
            "Oh, I love this one. {note}. It's one of those pictures that just captures way more than any camera could ever truly show."
        ]
    }
};

// Analyze note content and generate contextually appropriate narration
function generateAIStory(note) {
    const lowerNote = note.toLowerCase();
    let matchedPatterns = [];
    let highestMatchCount = 0;
    let bestMatch = 'general';
    
    // Check each emotional pattern for keyword matches
    for (const [emotion, pattern] of Object.entries(emotionalPatterns)) {
        if (emotion === 'general') continue;
        
        let matchCount = 0;
        for (const keyword of pattern.keywords) {
            if (lowerNote.includes(keyword)) {
                matchCount++;
            }
        }
        
        if (matchCount > highestMatchCount) {
            highestMatchCount = matchCount;
            bestMatch = emotion;
        }
        
        // Also collect all patterns that have at least one match
        if (matchCount > 0) {
            matchedPatterns.push({ emotion, count: matchCount, pattern });
        }
    }
    
    // Get the expressions for the best matching emotion
    const selectedPattern = emotionalPatterns[bestMatch];
    const expressions = selectedPattern.expressions;
    
    // Pick a random expression from the matched pattern
    const template = expressions[Math.floor(Math.random() * expressions.length)];
    
    // Insert the note into the template
    return template.replace('{note}', note.toLowerCase());
}

// Generate therapeutic memory description using OpenAI
async function generateOpenAINarration(note, imageBase64 = null) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
        console.log('OpenAI API key not configured, using local generation');
        return generateAIStory(note);
    }
    
    const systemPrompt = `You are a gentle, warm, and deeply empathetic memory therapist and meditation guide. Your role is to help people relive their cherished memories in a calming, therapeutic way.

When given a memory note and optionally an image, create a beautiful, meditative narration that:
- Speaks directly to the listener in second person ("you")
- Uses a slow, peaceful, and soothing tone perfect for meditation
- Helps the person emotionally reconnect with the moment
- Incorporates sensory details (what they might have seen, heard, felt, smelled)
- Validates their emotions and the importance of this memory
- Includes gentle pauses (use "..." for natural breathing moments)
- Feels like a warm, healing journey back to that moment
- Is about 3-5 sentences, perfect for audio narration
- Ends with a grounding, peaceful reflection

Your narration will be read aloud as a meditation, so write it to be spoken naturally and soothingly.`;

    const userMessage = `Here is a precious memory that someone wants to revisit:

"${note}"

Please create a therapeutic, meditation-like narration that will help them relive this beautiful moment. Make it calming, warm, and emotionally resonant.`;

    try {
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
        ];

        // If we have an image, use GPT-4 Vision
        let model = 'gpt-4o';
        let requestBody = {
            model: model,
            messages: messages,
            max_tokens: 300,
            temperature: 0.8
        };

        // If image is provided, include it in the request
        if (imageBase64 && imageBase64.startsWith('data:image')) {
            requestBody.messages = [
                { role: 'system', content: systemPrompt },
                { 
                    role: 'user', 
                    content: [
                        { type: 'text', text: userMessage },
                        { 
                            type: 'image_url', 
                            image_url: { 
                                url: imageBase64,
                                detail: 'low' 
                            } 
                        }
                    ]
                }
            ];
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', response.status, errorData);
            throw new Error(errorData.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const narration = data.choices[0]?.message?.content?.trim();
        
        if (narration) {
            console.log('OpenAI narration generated successfully');
            return narration;
        }
        
        throw new Error('No narration generated');
    } catch (error) {
        console.error('Error generating OpenAI narration:', error);
        // Fallback to local generation
        return generateAIStory(note);
    }
}

// Generate a unified meditation script for ALL moments at once
// Returns structured data with segments for each moment
async function generateUnifiedMeditationScript(storiesToNarrate, storyTitle) {
    if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY') {
        console.log('OpenAI API key not configured');
        return null;
    }

    const systemPrompt = `You are a deeply empathetic meditation guide and memory therapist. You will receive a series of precious moments from someone's life, each with a photo and a personal note.

Your task is to create ONE continuous, flowing meditation script that guides the listener through ALL their memories as a single beautiful journey. This is not separate descriptions - it's one unified narrative that weaves through each moment.

CRITICAL INSTRUCTIONS:
1. ANALYZE EACH IMAGE CAREFULLY - Describe specific visual details you can see (people, places, expressions, colors, lighting, objects, scenery, weather, time of day)
2. Be EXTREMELY personal and detailed - mention specific things visible in each photo
3. Create smooth, poetic transitions between moments
4. Use second person ("you") to speak directly to the listener
5. Include sensory details (sight, sound, smell, touch, feeling)
6. Pace it like a calming meditation with natural pauses
7. Each moment should be 4-6 sentences of rich, detailed narration
8. The entire script should flow as one continuous piece

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
[MOMENT 1]
(Your detailed, personal narration for the first moment, describing what you see in the image and weaving in their note)

[MOMENT 2]
(Smooth transition, then detailed narration for moment 2)

[MOMENT 3]
(Continue the pattern...)

[CLOSING]
(A beautiful, grounding conclusion that ties all memories together)

Remember: Actually LOOK at each image and describe what you see. Be specific about faces, places, objects, lighting, and atmosphere. Make each person feel like you truly see their memory.`;

    // Build content array with all images and notes
    const contentArray = [
        { 
            type: 'text', 
            text: `Story Title: "${storyTitle || 'My Precious Memories'}"\n\nI'm sharing ${storiesToNarrate.length} precious moments from my life. Please create a unified meditation script that flows through all of them:\n\n`
        }
    ];

    storiesToNarrate.forEach((story, index) => {
        contentArray.push({
            type: 'text',
            text: `\n--- MOMENT ${index + 1} ---\nMy note: "${story.note}"\nPhoto:`
        });
        
        // Add the image if it's base64
        if (story.image && story.image.startsWith('data:image')) {
            contentArray.push({
                type: 'image_url',
                image_url: {
                    url: story.image,
                    detail: 'high' // Use high detail for better image analysis
                }
            });
        }
    });

    contentArray.push({
        type: 'text',
        text: '\n\nNow create one beautiful, flowing meditation script that takes me through all these moments. Remember to describe specific visual details from each photo and make smooth transitions between them.'
    });

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: contentArray }
                ],
                max_tokens: 2000,
                temperature: 0.85
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('OpenAI API error:', response.status, errorData);
            throw new Error(errorData.error?.message || 'OpenAI API error');
        }

        const data = await response.json();
        const fullScript = data.choices[0]?.message?.content?.trim();
        
        if (!fullScript) {
            throw new Error('No script generated');
        }

        console.log('Unified meditation script generated:', fullScript);

        // Parse the script into segments
        const segments = parseMeditationScript(fullScript, storiesToNarrate.length);
        return segments;

    } catch (error) {
        console.error('Error generating unified meditation:', error);
        return null;
    }
}

// Parse the meditation script into segments with moment markers
function parseMeditationScript(script, numMoments) {
    const segments = [];
    
    // Split by [MOMENT X] markers
    const parts = script.split(/\[MOMENT\s*\d+\]/i);
    
    // First part might be empty or intro text
    let closingText = '';
    
    for (let i = 1; i <= numMoments; i++) {
        const partIndex = i;
        let text = parts[partIndex] || '';
        
        // Check if this part contains [CLOSING]
        if (text.includes('[CLOSING]')) {
            const closingSplit = text.split(/\[CLOSING\]/i);
            text = closingSplit[0].trim();
            closingText = closingSplit[1]?.trim() || '';
        }
        
        text = text.trim();
        
        if (text) {
            segments.push({
                momentIndex: i - 1,
                text: text,
                type: 'moment'
            });
        }
    }
    
    // Extract closing if not already found
    if (!closingText) {
        const closingMatch = script.match(/\[CLOSING\]([\s\S]*?)$/i);
        if (closingMatch) {
            closingText = closingMatch[1].trim();
        }
    }
    
    if (closingText) {
        segments.push({
            momentIndex: -1,
            text: closingText,
            type: 'closing'
        });
    }
    
    return segments;
}

// Meditation viewer state
let meditationAudio = null;
let meditationSegments = [];
let currentMeditationSegment = 0;
let meditationTrackingInterval = null;

// Initialize App
async function init() {
    // Set up event listeners first
    setupEventListeners();
    
    // Listen for Firebase Auth state changes
    onAuthStateChange(async (user) => {
        if (user) {
            // User is signed in with Firebase Auth
            currentUser = user.displayName || user.email;
            localStorage.setItem('storifyUser', currentUser);
            
            // Hide login, show story page
            loginPage.classList.add('hidden');
            storyPage.classList.remove('hidden');
            welcomeUser.textContent = `Welcome back, ${currentUser}`;
            
            // Load their saved stories and title
            await loadStories();
            renderStories();
            
            // Show narration panel if they have stories
            if (stories.length > 0) {
                updateNarrationPanel();
                narrationPanel.classList.remove('hidden');
            } else {
                narrationPanel.classList.add('hidden');
            }
            
            console.log('Firebase Auth user:', currentUser, 'Stories loaded:', stories.length);
        } else {
            // No Firebase user - check for legacy localStorage user
            const savedUser = localStorage.getItem('storifyUser');
            
            if (savedUser) {
                // Legacy user exists - prompt them to re-login with Firebase
                console.log('Legacy user found, please sign in again with Firebase Auth');
                localStorage.removeItem('storifyUser'); // Clear legacy session
            }
            
            // Show login page
            loginPage.classList.remove('hidden');
            storyPage.classList.add('hidden');
            narrationPanel.classList.add('hidden');
        }
    });
}

// Check if user is logged in (called after login)
function checkLoginStatus() {
    const savedUser = localStorage.getItem('storifyUser');
    if (savedUser) {
        currentUser = savedUser;
        showStoryPage();
    }
}

// Setup Event Listeners
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    logoutBtn.addEventListener('click', handleLogout);

    addStoryBtn.addEventListener('click', openUploadModal);
    closeModal.addEventListener('click', closeUploadModalHandler);
    cancelUpload.addEventListener('click', closeUploadModalHandler);
    uploadModal.querySelector('.modal-overlay').addEventListener('click', closeUploadModalHandler);

    uploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleImageSelect);
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    saveStory.addEventListener('click', saveNewStory);

    closeDetailModal.addEventListener('click', closeDetailModalHandler);
    storyDetailModal.querySelector('.modal-overlay').addEventListener('click', closeDetailModalHandler);
    regenerateStory.addEventListener('click', regenerateAIStory);
    deletePhotoBtn.addEventListener('click', deleteCurrentStory);
    replacePhotoBtn.addEventListener('click', replaceCurrentPhoto);
    
    // Note editing events
    editNoteBtn.addEventListener('click', toggleNoteEdit);
    cancelNoteEdit.addEventListener('click', cancelNoteEditHandler);
    saveNoteEdit.addEventListener('click', saveNoteEditHandler);

    closeNarration.addEventListener('click', () => narrationPanel.classList.add('hidden'));
    playNarration.addEventListener('click', playStoryNarration);
    stopNarration.addEventListener('click', stopNarrationCompletely);
    
    // Reset start point button
    document.getElementById('resetStartPoint').addEventListener('click', () => {
        narrationStartChapter = 0;
        // Remove all start-point classes
        document.querySelectorAll('.story-point').forEach((sp) => {
            sp.classList.remove('start-point');
        });
        updateNarrationPanel();
        // Show reset confirmation
        const notification = document.createElement('div');
        notification.className = 'theme-notification';
        notification.innerHTML = `
            <i class="fas fa-undo"></i>
            <span>Reset to <strong>beginning</strong></span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.classList.add('show'), 100);
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    });

    // Drafts event listeners
    draftsBtn.addEventListener('click', openDraftsModal);
    closeDraftsModal.addEventListener('click', closeDraftsModalHandler);
    draftsModal.querySelector('.modal-overlay').addEventListener('click', closeDraftsModalHandler);
    saveAsDraft.addEventListener('click', saveCurrentAsDraft);
    startNewStory.addEventListener('click', startFreshStory);

    storyTitle.addEventListener('input', saveStoryTitle);
    
    // Auth toggle and signup listeners
    signupLink.addEventListener('click', toggleAuthMode);
    signupForm.addEventListener('submit', handleSignup);
    
    // Forgot password listeners
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', toggleForgotPasswordMode);
    }
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    
    // Password validation listeners
    signupPassword.addEventListener('input', validatePasswordRequirements);
    signupConfirmPassword.addEventListener('input', validatePasswordRequirements);
    
    // Meditation viewer close button
    const meditationClose = document.getElementById('meditationClose');
    if (meditationClose) {
        meditationClose.addEventListener('click', closeMeditationViewer);
    }
}

// ===== AUTHENTICATION SYSTEM =====

// Simple hash function for password (not cryptographically secure, but good for localStorage demo)
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
}

// Get all registered users
function getUsers() {
    const users = localStorage.getItem('storifyUsers');
    return users ? JSON.parse(users) : {};
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('storifyUsers', JSON.stringify(users));
}

// Check if user exists (now async for Firestore)
async function userExistsAsync(username) {
    // First check Firestore
    const firestoreExists = await userExistsInFirestore(username);
    if (firestoreExists) return true;
    
    // Fallback to localStorage for backwards compatibility
    const users = getUsers();
    return users.hasOwnProperty(username.toLowerCase());
}

// Check if user exists (sync version for backwards compatibility)
function userExists(username) {
    const users = getUsers();
    return users.hasOwnProperty(username.toLowerCase());
}

// Check if email exists (now async for Firestore)
async function emailExistsAsync(email) {
    // First check Firestore
    const firestoreExists = await emailExistsInFirestore(email);
    if (firestoreExists) return true;
    
    // Fallback to localStorage
    const users = getUsers();
    return Object.values(users).some(user => user.email.toLowerCase() === email.toLowerCase());
}

// Check if email exists (sync version)
function emailExists(email) {
    const users = getUsers();
    return Object.values(users).some(user => user.email.toLowerCase() === email.toLowerCase());
}

// Register new user (now saves to Firestore)
async function registerUserAsync(username, email, password) {
    const userData = {
        username: username,
        email: email.toLowerCase(),
        password: simpleHash(password),
        createdAt: new Date().toISOString()
    };
    
    // Save to Firestore
    await saveUserToFirestore(userData);
    
    // Also save to localStorage for offline support
    const users = getUsers();
    users[username.toLowerCase()] = userData;
    saveUsers(users);
}

// Register new user (sync version for backwards compatibility)
function registerUser(username, email, password) {
    const users = getUsers();
    users[username.toLowerCase()] = {
        username: username,
        email: email.toLowerCase(),
        password: simpleHash(password),
        createdAt: new Date().toISOString()
    };
    saveUsers(users);
}

// Validate user credentials (now async for Firestore)
async function validateCredentialsAsync(username, password) {
    // Try Firestore first
    const firestoreUser = await getUserFromFirestore(username);
    if (firestoreUser) {
        return firestoreUser.password === simpleHash(password);
    }
    
    // Fallback to localStorage
    const users = getUsers();
    const user = users[username.toLowerCase()];
    if (!user) return false;
    return user.password === simpleHash(password);
}

// Validate user credentials (sync version)
function validateCredentials(username, password) {
    const users = getUsers();
    const user = users[username.toLowerCase()];
    if (!user) return false;
    return user.password === simpleHash(password);
}

// Toggle between login and signup mode
function toggleAuthMode(e) {
    e.preventDefault();
    isSignupMode = !isSignupMode;
    isForgotMode = false;
    
    // Hide all errors/success messages
    loginError.classList.add('hidden');
    signupError.classList.add('hidden');
    signupSuccess.classList.add('hidden');
    if (forgotError) forgotError.classList.add('hidden');
    if (forgotSuccess) forgotSuccess.classList.add('hidden');
    
    if (isSignupMode) {
        // Show signup form
        loginForm.classList.add('hidden');
        forgotPasswordForm.classList.add('hidden');
        signupForm.classList.remove('hidden');
        authSubtitle.textContent = 'Create your account';
        authToggleText.innerHTML = 'Already have an account? <a href="#" id="signupLink">Sign in</a>';
        forgotPasswordText.classList.add('hidden');
    } else {
        // Show login form
        signupForm.classList.add('hidden');
        forgotPasswordForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        authSubtitle.textContent = 'Where every picture tells a story';
        authToggleText.innerHTML = 'New to Storify? <a href="#" id="signupLink">Create an account</a>';
        forgotPasswordText.classList.remove('hidden');
    }
    
    // Re-attach the click listener to the new link
    document.getElementById('signupLink').addEventListener('click', toggleAuthMode);
}

// Toggle to forgot password mode
function toggleForgotPasswordMode(e) {
    e.preventDefault();
    isForgotMode = true;
    isSignupMode = false;
    
    // Hide all errors/success messages
    loginError.classList.add('hidden');
    signupError.classList.add('hidden');
    signupSuccess.classList.add('hidden');
    if (forgotError) forgotError.classList.add('hidden');
    if (forgotSuccess) forgotSuccess.classList.add('hidden');
    
    // Show forgot password form
    loginForm.classList.add('hidden');
    signupForm.classList.add('hidden');
    forgotPasswordForm.classList.remove('hidden');
    authSubtitle.textContent = 'Reset your password';
    authToggleText.innerHTML = 'Remember your password? <a href="#" id="signupLink">Sign in</a>';
    forgotPasswordText.classList.add('hidden');
    
    // Re-attach the click listener
    document.getElementById('signupLink').addEventListener('click', toggleAuthMode);
}

// Handle Forgot Password
async function handleForgotPassword(e) {
    e.preventDefault();
    
    const email = forgotEmail.value.trim();
    
    if (forgotError) forgotError.classList.add('hidden');
    if (forgotSuccess) forgotSuccess.classList.add('hidden');
    
    if (!email) {
        showForgotError('Please enter your email address');
        return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showForgotError('Please enter a valid email address');
        return;
    }
    
    // Show loading state
    const forgotBtn = forgotPasswordForm.querySelector('.login-btn');
    const originalText = forgotBtn.innerHTML;
    forgotBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    forgotBtn.disabled = true;
    
    try {
        const result = await sendPasswordReset(email);
        
        if (result.success) {
            showForgotSuccess('Password reset email sent! Check your inbox.');
            forgotEmail.value = '';
            
            // Auto switch to login after 3 seconds
            setTimeout(() => {
                isForgotMode = false;
                forgotPasswordForm.classList.add('hidden');
                loginForm.classList.remove('hidden');
                authSubtitle.textContent = 'Where every picture tells a story';
                authToggleText.innerHTML = 'New to Storify? <a href="#" id="signupLink">Create an account</a>';
                forgotPasswordText.classList.remove('hidden');
                document.getElementById('signupLink').addEventListener('click', toggleAuthMode);
                if (forgotSuccess) forgotSuccess.classList.add('hidden');
            }, 3000);
        } else {
            let errorMessage = result.error;
            if (result.code === 'auth/user-not-found') {
                errorMessage = 'No account found with this email address.';
            } else if (result.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            }
            showForgotError(errorMessage);
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        showForgotError('An error occurred. Please try again.');
    } finally {
        forgotBtn.innerHTML = originalText;
        forgotBtn.disabled = false;
    }
}

// Show forgot password error
function showForgotError(message) {
    if (forgotError) {
        forgotError.querySelector('span').textContent = message;
        forgotError.classList.remove('hidden');
        shakeElement(forgotPasswordForm);
    }
}

// Show forgot password success
function showForgotSuccess(message) {
    if (forgotSuccess) {
        forgotSuccess.querySelector('span').textContent = message;
        forgotSuccess.classList.remove('hidden');
    }
}

// Show login error
function showLoginError(message) {
    loginError.querySelector('span').textContent = message;
    loginError.classList.remove('hidden');
    shakeElement(loginForm);
}

// Show signup error
function showSignupError(message) {
    signupError.querySelector('span').textContent = message;
    signupError.classList.remove('hidden');
    signupSuccess.classList.add('hidden');
    shakeElement(signupForm);
}

// Show signup success
function showSignupSuccess(message) {
    signupSuccess.querySelector('span').textContent = message;
    signupSuccess.classList.remove('hidden');
    signupError.classList.add('hidden');
}

// Validate password requirements in real-time
function validatePasswordRequirements() {
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;
    
    // Check length
    if (password.length >= 6) {
        reqLength.classList.add('valid');
    } else {
        reqLength.classList.remove('valid');
    }
    
    // Check match
    if (password && confirmPassword && password === confirmPassword) {
        reqMatch.classList.add('valid');
    } else {
        reqMatch.classList.remove('valid');
    }
}

// Handle Login
async function handleLogin(e) {
    e.preventDefault();
    const usernameOrEmail = usernameInput.value.trim();
    const password = passwordInput.value;
    
    loginError.classList.add('hidden');

    if (!usernameOrEmail || !password) {
        showLoginError('Please fill in all fields');
        return;
    }
    
    // Show loading state
    const loginBtn = loginForm.querySelector('.login-btn');
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    loginBtn.disabled = true;
    
    try {
        let result;
        
        // Check if input is email or username
        if (usernameOrEmail.includes('@')) {
            // Sign in with email
            result = await signInWithEmail(usernameOrEmail, password);
        } else {
            // Sign in with username (looks up email first)
            result = await signInWithUsername(usernameOrEmail, password);
        }
        
        if (!result.success) {
            // Handle specific Firebase Auth errors
            let errorMessage = result.error;
            if (result.code === 'auth/user-not-found') {
                errorMessage = 'Account not found. Please sign up first.';
            } else if (result.code === 'auth/wrong-password') {
                errorMessage = 'Incorrect password. Please try again.';
            } else if (result.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (result.code === 'auth/too-many-requests') {
                errorMessage = 'Too many failed attempts. Please try again later.';
            }
            showLoginError(errorMessage);
            loginBtn.innerHTML = originalText;
            loginBtn.disabled = false;
            return;
        }
        
        // Success - login user
        const user = result.user;
        currentUser = user.displayName || usernameOrEmail;
        localStorage.setItem('storifyUser', currentUser);
        await showStoryPage();
    } catch (error) {
        console.error('Login error:', error);
        showLoginError('An error occurred. Please try again.');
    } finally {
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    }
}

// Handle Signup
async function handleSignup(e) {
    e.preventDefault();
    
    const username = signupUsername.value.trim();
    const email = signupEmail.value.trim();
    const password = signupPassword.value;
    const confirmPassword = signupConfirmPassword.value;
    
    signupError.classList.add('hidden');
    signupSuccess.classList.add('hidden');
    
    // Validate username
    if (username.length < 3) {
        showSignupError('Username must be at least 3 characters');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showSignupError('Username can only contain letters, numbers, and underscores');
        return;
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showSignupError('Please enter a valid email address');
        return;
    }
    
    // Validate password
    if (password.length < 6) {
        showSignupError('Password must be at least 6 characters');
        return;
    }
    
    // Check password match
    if (password !== confirmPassword) {
        showSignupError('Passwords do not match');
        return;
    }
    
    // Show loading state
    const signupBtn = signupForm.querySelector('.signup-btn');
    const originalText = signupBtn.innerHTML;
    signupBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating account...';
    signupBtn.disabled = true;
    
    try {
        // Check if username is available
        const usernameAvailable = await isUsernameAvailable(username);
        if (!usernameAvailable) {
            showSignupError('Username already taken. Please choose another.');
            signupBtn.innerHTML = originalText;
            signupBtn.disabled = false;
            return;
        }
        
        // Create user with Firebase Auth
        const result = await createUserWithEmail(email, password, username);
        
        if (!result.success) {
            // Handle specific Firebase Auth errors
            let errorMessage = result.error;
            if (result.code === 'auth/email-already-in-use') {
                errorMessage = 'Email already registered. Please sign in.';
            } else if (result.code === 'auth/invalid-email') {
                errorMessage = 'Invalid email address.';
            } else if (result.code === 'auth/weak-password') {
                errorMessage = 'Password is too weak. Please use a stronger password.';
            }
            showSignupError(errorMessage);
            signupBtn.innerHTML = originalText;
            signupBtn.disabled = false;
            return;
        }
        
        // Show success and switch to login
        showSignupSuccess('Account created successfully! Redirecting to login...');
        
        // Sign out the user so they can login fresh
        await signOutUser();
        
        // Clear form
        signupUsername.value = '';
        signupEmail.value = '';
        signupPassword.value = '';
        signupConfirmPassword.value = '';
        reqLength.classList.remove('valid');
        reqMatch.classList.remove('valid');
        
        // Auto switch to login after 2 seconds
        setTimeout(() => {
            isSignupMode = false;
            isForgotMode = false;
            signupForm.classList.add('hidden');
            forgotPasswordForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            authSubtitle.textContent = 'Where every picture tells a story';
            authToggleText.innerHTML = 'New to Storify? <a href="#" id="signupLink">Create an account</a>';
            forgotPasswordText.classList.remove('hidden');
            document.getElementById('signupLink').addEventListener('click', toggleAuthMode);
            
            // Pre-fill email for convenience
            usernameInput.value = email;
            passwordInput.focus();
            
            signupSuccess.classList.add('hidden');
        }, 2000);
    } catch (error) {
        console.error('Signup error:', error);
        showSignupError('An error occurred. Please try again.');
    } finally {
        signupBtn.innerHTML = originalText;
        signupBtn.disabled = false;
    }
}

// Handle Logout
async function handleLogout() {
    // Sign out from Firebase Auth
    await signOutUser();
    
    currentUser = null;
    stories = []; // Clear stories array on logout
    localStorage.removeItem('storifyUser');
    stopAudio();
    loginPage.classList.remove('hidden');
    storyPage.classList.add('hidden');
    usernameInput.value = '';
    passwordInput.value = '';
    storyTitle.value = '';
    loginError.classList.add('hidden');
    
    // Reset to login mode
    isSignupMode = false;
    isForgotMode = false;
    signupForm.classList.add('hidden');
    forgotPasswordForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
    authSubtitle.textContent = 'Where every picture tells a story';
    forgotPasswordText.classList.remove('hidden');
}

// Show Story Page (called after login)
async function showStoryPage() {
    loginPage.classList.add('hidden');
    storyPage.classList.remove('hidden');
    welcomeUser.textContent = `Welcome, ${currentUser}`;
    
    // Load user-specific stories (now async)
    await loadStories();
    renderStories();
    
    console.log('User logged in:', currentUser, 'Stories:', stories.length);
}

// Shake animation
function shakeElement(element) {
    element.style.animation = 'none';
    element.offsetHeight;
    element.style.animation = 'shake 0.5s ease';
}

// Modal functions
function openUploadModal() {
    uploadModal.classList.remove('hidden');
    resetUploadForm();
}

function closeUploadModalHandler() {
    uploadModal.classList.add('hidden');
    resetUploadForm();
}

function resetUploadForm() {
    imageInput.value = '';
    imageNote.value = '';
    selectedImage = null;
    selectedFilename = null;
    imagePreview.classList.add('hidden');
    uploadPlaceholder.classList.remove('hidden');
}

// Image handling
function handleImageSelect(e) {
    const file = e.target.files[0];
    if (file) processImageFile(file);
}

function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    }
}

function processImageFile(file) {
    const reader = new FileReader();
    // Save the filename for theme detection
    selectedFilename = file.name || '';
    reader.onload = (e) => {
        selectedImage = e.target.result;
        imagePreview.src = selectedImage;
        imagePreview.classList.remove('hidden');
        uploadPlaceholder.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// ===== Color Analysis & Theme Detection =====

// Advanced color analysis - extracts colors and analyzes image characteristics
function analyzeImage(imageData) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const size = 100; // Larger sample for better accuracy
            canvas.width = size;
            canvas.height = size;
            ctx.drawImage(img, 0, 0, size, size);
            
            const imgData = ctx.getImageData(0, 0, size, size);
            const data = imgData.data;
            
            // Track various color characteristics
            let totalPixels = 0;
            let skyBlue = 0, oceanBlue = 0, deepBlue = 0;
            let brightGreen = 0, darkGreen = 0, forestGreen = 0;
            let sandColor = 0, brownEarth = 0;
            let sunsetOrange = 0, sunsetPink = 0, sunsetRed = 0;
            let snowWhite = 0, iceBlue = 0;
            let nightDark = 0, cityLights = 0;
            let desertYellow = 0, desertBrown = 0;
            
            // Analyze top portion (sky) vs bottom (ground)
            let topHalf = { blue: 0, orange: 0, dark: 0, white: 0, count: 0 };
            let bottomHalf = { green: 0, sand: 0, snow: 0, count: 0 };
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const pixelIndex = i / 4;
                const row = Math.floor(pixelIndex / size);
                const isTopHalf = row < size / 2;
                
                totalPixels++;
                
                // Calculate color properties
                const brightness = (r + g + b) / 3;
                const saturation = Math.max(r, g, b) - Math.min(r, g, b);
                
                // Sky blue detection (light blue)
                if (b > 150 && b > r && b > g && brightness > 120) skyBlue++;
                
                // Ocean/water blue (deeper blue)
                if (b > 100 && b > r * 1.3 && b > g * 1.2 && brightness < 180) oceanBlue++;
                
                // Deep blue (night sky, deep water)
                if (b > 80 && b > r * 1.5 && b > g * 1.3 && brightness < 100) deepBlue++;
                
                // Bright green (grass, leaves)
                if (g > 100 && g > r * 1.2 && g > b * 1.2 && brightness > 80) brightGreen++;
                
                // Dark/forest green
                if (g > 50 && g > r && g > b && brightness < 100) darkGreen++;
                
                // Forest green (medium green)
                if (g > 70 && g > r * 1.1 && g > b && brightness > 50 && brightness < 150) forestGreen++;
                
                // Sand color (beach)
                if (r > 180 && g > 150 && b > 100 && r > b && Math.abs(r - g) < 50) sandColor++;
                
                // Brown earth
                if (r > 100 && r > b * 1.5 && g > 50 && g < r && brightness < 150) brownEarth++;
                
                // Sunset orange
                if (r > 180 && g > 80 && g < 180 && b < 120 && r > g) sunsetOrange++;
                
                // Sunset pink/magenta
                if (r > 150 && b > 100 && g < r && g < b) sunsetPink++;
                
                // Sunset red
                if (r > 150 && r > g * 1.5 && r > b * 1.5 && brightness < 180) sunsetRed++;
                
                // Snow white
                if (brightness > 220 && saturation < 30) snowWhite++;
                
                // Ice blue (light blue-white)
                if (b > 180 && brightness > 200 && Math.abs(r - g) < 30) iceBlue++;
                
                // Night dark
                if (brightness < 50) nightDark++;
                
                // City lights (bright spots in dark)
                if (brightness > 200 && saturation > 50) cityLights++;
                
                // Desert yellow
                if (r > 180 && g > 150 && b < 120 && r > b * 1.5) desertYellow++;
                
                // Desert/canyon brown
                if (r > 120 && g > 60 && g < 120 && b < 80) desertBrown++;
                
                // Track by position
                if (isTopHalf) {
                    topHalf.count++;
                    if (b > r && b > g) topHalf.blue++;
                    if (r > 150 && g > 80 && b < 100) topHalf.orange++;
                    if (brightness < 60) topHalf.dark++;
                    if (brightness > 220) topHalf.white++;
                } else {
                    bottomHalf.count++;
                    if (g > r && g > b) bottomHalf.green++;
                    if (r > 150 && g > 120 && b < 130) bottomHalf.sand++;
                    if (brightness > 230) bottomHalf.snow++;
                }
            }
            
            // Calculate percentages
            const pct = (val) => (val / totalPixels) * 100;
            
            resolve({
                skyBlue: pct(skyBlue),
                oceanBlue: pct(oceanBlue),
                deepBlue: pct(deepBlue),
                brightGreen: pct(brightGreen),
                darkGreen: pct(darkGreen),
                forestGreen: pct(forestGreen),
                sandColor: pct(sandColor),
                brownEarth: pct(brownEarth),
                sunsetOrange: pct(sunsetOrange),
                sunsetPink: pct(sunsetPink),
                sunsetRed: pct(sunsetRed),
                snowWhite: pct(snowWhite),
                iceBlue: pct(iceBlue),
                nightDark: pct(nightDark),
                cityLights: pct(cityLights),
                desertYellow: pct(desertYellow),
                desertBrown: pct(desertBrown),
                topHalf: {
                    blue: (topHalf.blue / topHalf.count) * 100,
                    orange: (topHalf.orange / topHalf.count) * 100,
                    dark: (topHalf.dark / topHalf.count) * 100,
                    white: (topHalf.white / topHalf.count) * 100
                },
                bottomHalf: {
                    green: (bottomHalf.green / bottomHalf.count) * 100,
                    sand: (bottomHalf.sand / bottomHalf.count) * 100,
                    snow: (bottomHalf.snow / bottomHalf.count) * 100
                }
            });
        };
        img.onerror = () => resolve(null);
        img.src = imageData;
    });
}

// Analyze all images and determine best theme based on IMAGE CONTENT
async function analyzeImagesAndSetTheme() {
    if (stories.length === 0) {
        applyTheme('mountain');
        return;
    }
    
    // Analyze all images
    const analyses = [];
    for (const story of stories) {
        try {
            const analysis = await analyzeImage(story.image);
            if (analysis) analyses.push(analysis);
        } catch (e) {
            console.log('Could not analyze image');
        }
    }
    
    if (analyses.length === 0) {
        return;
    }
    
    // Aggregate all image analyses
    const avg = {};
    const keys = Object.keys(analyses[0]).filter(k => typeof analyses[0][k] === 'number');
    
    for (const key of keys) {
        avg[key] = analyses.reduce((sum, a) => sum + (a[key] || 0), 0) / analyses.length;
    }
    
    // Also average the topHalf and bottomHalf objects
    avg.topHalf = {
        blue: analyses.reduce((sum, a) => sum + (a.topHalf?.blue || 0), 0) / analyses.length,
        orange: analyses.reduce((sum, a) => sum + (a.topHalf?.orange || 0), 0) / analyses.length,
        dark: analyses.reduce((sum, a) => sum + (a.topHalf?.dark || 0), 0) / analyses.length,
        white: analyses.reduce((sum, a) => sum + (a.topHalf?.white || 0), 0) / analyses.length
    };
    avg.bottomHalf = {
        green: analyses.reduce((sum, a) => sum + (a.bottomHalf?.green || 0), 0) / analyses.length,
        sand: analyses.reduce((sum, a) => sum + (a.bottomHalf?.sand || 0), 0) / analyses.length,
        snow: analyses.reduce((sum, a) => sum + (a.bottomHalf?.snow || 0), 0) / analyses.length
    };
    
    console.log('Image Analysis Results:', avg);
    
    // Determine theme based on sophisticated color analysis
    let detectedTheme = 'mountain';
    let highestScore = 0;
    
    const themeScores = {
        beach: 0,
        sunset: 0,
        forest: 0,
        night: 0,
        winter: 0,
        desert: 0,
        mountain: 0
    };
    
    // Beach: Blue sky/ocean + sand (tropical feel)
    themeScores.beach = (avg.skyBlue * 2) + (avg.oceanBlue * 3) + (avg.sandColor * 2.5) + (avg.bottomHalf.sand * 2) + (avg.topHalf.blue * 1.5);
    
    // Sunset: Orange, pink, red, warm colors in sky
    themeScores.sunset = (avg.sunsetOrange * 3) + (avg.sunsetPink * 2.5) + (avg.sunsetRed * 2.5) + (avg.topHalf.orange * 3);
    
    // Forest: Dominant green colors
    themeScores.forest = (avg.brightGreen * 2.5) + (avg.darkGreen * 3) + (avg.forestGreen * 2.5) + (avg.bottomHalf.green * 2);
    
    // Night: Very dark with some lights
    themeScores.night = (avg.nightDark * 3) + (avg.deepBlue * 2) + (avg.topHalf.dark * 2.5) + (avg.cityLights * 1);
    
    // Winter: White/bright snow, icy blue tones
    themeScores.winter = (avg.snowWhite * 3) + (avg.iceBlue * 2.5) + (avg.bottomHalf.snow * 2.5) + (avg.topHalf.white * 2);
    
    // Desert: Yellow, brown, sand, warm earth tones
    themeScores.desert = (avg.desertYellow * 2.5) + (avg.desertBrown * 2.5) + (avg.brownEarth * 2) + (avg.sandColor * 1) - (avg.oceanBlue * 1);
    
    // Mountain: Default fallback - only wins if nothing else is strong (lower base)
    themeScores.mountain = 3 + (avg.deepBlue * 0.3) + (avg.darkGreen * 0.3) + (avg.brownEarth * 0.2);
    
    console.log('Theme Scores:', themeScores);
    
    // Find the highest scoring theme
    for (const [theme, score] of Object.entries(themeScores)) {
        if (score > highestScore) {
            highestScore = score;
            detectedTheme = theme;
        }
    }
    
    console.log('Detected Theme:', detectedTheme, 'with score:', highestScore);
    
    // Apply the detected theme
    applyTheme(detectedTheme);
    if (detectedTheme !== currentTheme) {
        showThemeNotification(detectedTheme);
    }
}

// Apply theme to the page
function applyTheme(themeName) {
    const theme = themes[themeName];
    if (!theme) return;
    
    currentTheme = themeName;
    if (currentUser) {
        localStorage.setItem('storifyTheme_' + currentUser, themeName);
    }
    
    const scenery = document.querySelector('.scenery-background');
    if (scenery) {
        scenery.style.background = theme.gradient;
    }
    
    // Update mountains
    const mountains = document.querySelectorAll('.mountain');
    if (mountains.length >= 3) {
        mountains[0].style.borderBottomColor = theme.mountainColor1;
        mountains[1].style.borderBottomColor = theme.mountainColor2;
        mountains[2].style.borderBottomColor = theme.mountainColor3;
    }
    
    // Update trees via CSS variable on document root
    document.documentElement.style.setProperty('--tree-color', theme.treeColor);
    
    // Update ground
    const ground = document.querySelector('.ground');
    if (ground) {
        ground.style.background = theme.groundColor;
    }
    
    // Add theme class for additional styling
    document.body.className = '';
    document.body.classList.add('theme-' + themeName);
    
    console.log('Theme applied:', themeName);
}

// Show notification when theme changes
function showThemeNotification(themeName) {
    const theme = themes[themeName];
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
        <i class="fas fa-palette"></i>
        <span>Theme changed to <strong>${theme.name}</strong></span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Story management
async function saveNewStory() {
    if (!selectedImage) {
        alert('Please select an image first!');
        return;
    }

    const note = imageNote.value.trim() || 'A beautiful moment captured in time...';
    
    // Show loading state
    saveStory.disabled = true;
    saveStory.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating your memory...';
    
    // Generate AI narration using OpenAI (with image if available)
    let aiStory;
    try {
        aiStory = await generateOpenAINarration(note, selectedImage);
    } catch (error) {
        console.error('Error generating AI narration:', error);
        aiStory = generateAIStory(note); // Fallback to local generation
    }

    const newStory = {
        id: Date.now(),
        image: selectedImage,
        filename: selectedFilename || '',
        note: note,
        aiNarration: aiStory,
        createdAt: new Date().toISOString()
    };

    stories.push(newStory);
    saveStories();
    renderStories();
    
    // Reset button state
    saveStory.disabled = false;
    saveStory.innerHTML = '<i class="fas fa-feather-alt"></i> Add to Story';
    
    closeUploadModalHandler();
    updateNarrationPanel();
    
    // Analyze images and update theme
    analyzeImagesAndSetTheme();
    
    // Show success notification
    showNotification('fa-sparkles', 'Memory added with AI meditation!', '#4A7C6F');
}

function saveStories() {
    if (!currentUser) return;
    
    // Save to Firestore (async, non-blocking) - this handles Cloud Storage for images
    saveStoriesToFirestore(currentUser, stories).then(() => {
        console.log('Stories synced to Firestore');
    }).catch(err => {
        console.error('Error syncing stories to Firestore:', err);
    });
    
    // Only save to localStorage if images are already URLs (not base64)
    // This prevents localStorage quota issues
    const storiesForLocalStorage = stories.map(story => {
        // If image is a Cloud Storage URL, keep it; if base64, skip it for localStorage
        if (story.image && story.image.startsWith('data:')) {
            return { ...story, image: '[stored in cloud]' }; // Placeholder for localStorage
        }
        return story;
    });
    
    const key = 'storifyStories_' + currentUser;
    try {
        localStorage.setItem(key, JSON.stringify(storiesForLocalStorage));
    } catch (e) {
        console.warn('LocalStorage full, using Firestore only:', e.message);
        // Clear old localStorage data to free space
        localStorage.removeItem(key);
    }
}

async function loadStories() {
    if (!currentUser) {
        stories = [];
        drafts = [];
        console.log('No user, stories cleared');
        return;
    }
    
    // Clear stories array first to prevent stacking
    stories = [];
    
    // Try to load from Firestore first
    try {
        const firestoreStories = await loadStoriesFromFirestore(currentUser);
        if (firestoreStories && firestoreStories.length > 0) {
            stories = firestoreStories;
            console.log('Loaded', stories.length, 'stories from Firestore');
        } else {
            // Fallback to localStorage
            const key = 'storifyStories_' + currentUser;
            const savedStories = localStorage.getItem(key);
            console.log('Loading stories for:', currentUser, 'Key:', key, 'Found:', savedStories ? 'yes' : 'no');
            
            if (savedStories) {
                try {
                    stories = JSON.parse(savedStories);
                    console.log('Loaded', stories.length, 'stories from localStorage');
                    
                    // Sync to Firestore if we found local stories
                    if (stories.length > 0) {
                        await saveStoriesToFirestore(currentUser, stories);
                        console.log('Synced local stories to Firestore');
                    }
                } catch (e) {
                    console.error('Error loading stories:', e);
                    stories = [];
                }
            }
        }
    } catch (error) {
        console.error('Error loading from Firestore, using localStorage:', error);
        // Fallback to localStorage
        const key = 'storifyStories_' + currentUser;
        const savedStories = localStorage.getItem(key);
        if (savedStories) {
            try {
                stories = JSON.parse(savedStories);
            } catch (e) {
                stories = [];
            }
        }
    }
    
    // Load drafts
    await loadDrafts();
    
    // Load title from Firestore
    try {
        const firestoreTitle = await loadStoryTitleFromFirestore(currentUser);
        if (firestoreTitle) {
            storyTitle.value = firestoreTitle;
        } else {
            const titleKey = 'storifyTitle_' + currentUser;
            const savedTitle = localStorage.getItem(titleKey);
            if (savedTitle) {
                storyTitle.value = savedTitle;
            } else {
                storyTitle.value = '';
            }
        }
    } catch (error) {
        const titleKey = 'storifyTitle_' + currentUser;
        const savedTitle = localStorage.getItem(titleKey);
        if (savedTitle) {
            storyTitle.value = savedTitle;
        } else {
            storyTitle.value = '';
        }
    }
    
    // Always analyze images to set theme based on photo content
    // This will update the theme if the images suggest a different theme
    if (stories.length > 0) {
        setTimeout(() => analyzeImagesAndSetTheme(), 200);
    } else {
        // Default theme if no stories
        applyTheme('mountain');
    }
}

function saveStoryTitle() {
    if (!currentUser) return;
    const key = 'storifyTitle_' + currentUser;
    localStorage.setItem(key, storyTitle.value);
    
    // Also save to Firestore
    saveStoryTitleToFirestore(currentUser, storyTitle.value).catch(err => {
        console.error('Error saving title to Firestore:', err);
    });
}

// Render stories
function renderStories() {
    storyPoints.innerHTML = '';

    if (stories.length === 0) {
        storyPoints.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-mountain-sun"></i>
                <h3>Your adventure awaits</h3>
                <p>Click the + button to begin your journey</p>
            </div>
        `;
        updateCurvePath([]);
        return;
    }

    const positions = [];
    
    stories.forEach((story, index) => {
        const storyPoint = document.createElement('div');
        storyPoint.className = 'story-point';
        if (index === narrationStartChapter) {
            storyPoint.classList.add('start-point');
        }
        storyPoint.innerHTML = `
            <div class="story-point-image">
                <img src="${story.image}" alt="Story moment ${index + 1}">
            </div>
            <div class="story-point-number">${index + 1}</div>
            <p class="story-point-note">${story.note}</p>
            <button class="start-here-btn" title="Start narration from here">
                <i class="fas fa-play"></i>
            </button>
        `;
        
        // Click on image opens detail
        storyPoint.querySelector('.story-point-image').addEventListener('click', () => openStoryDetail(index));
        
        // Click on start button sets this as narration start point
        storyPoint.querySelector('.start-here-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            setNarrationStartPoint(index);
        });
        storyPoints.appendChild(storyPoint);
        
        setTimeout(() => {
            const rect = storyPoint.getBoundingClientRect();
            const containerRect = storyPoints.parentElement.getBoundingClientRect();
            positions.push({
                x: rect.left - containerRect.left + rect.width / 2,
                y: rect.top - containerRect.top + rect.height / 2
            });
            
            if (positions.length === stories.length) {
                updateCurvePath(positions);
            }
        }, 100);
    });

    narrationPanel.classList.remove('hidden');
    updateNarrationPanel();
}

// Update curved path
function updateCurvePath(positions) {
    const path = document.getElementById('curvePath');
    
    if (positions.length < 2) {
        path.setAttribute('d', '');
        return;
    }

    let d = `M ${positions[0].x} ${positions[0].y}`;
    
    for (let i = 1; i < positions.length; i++) {
        const prev = positions[i - 1];
        const curr = positions[i];
        
        const midX = (prev.x + curr.x) / 2;
        const curveStrength = 60 + Math.random() * 30;
        
        const controlX1 = prev.x + (midX - prev.x) * 0.6;
        const controlY1 = prev.y + (i % 2 === 0 ? -curveStrength : curveStrength);
        const controlX2 = curr.x - (curr.x - midX) * 0.6;
        const controlY2 = curr.y + (i % 2 === 0 ? curveStrength : -curveStrength);
        
        d += ` C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${curr.x} ${curr.y}`;
    }
    
    path.setAttribute('d', d);
}

// Story detail modal
function openStoryDetail(index) {
    currentStoryIndex = index;
    const story = stories[index];
    
    detailImage.src = story.image;
    detailChapter.textContent = `Moment ${index + 1}`;
    detailNote.textContent = story.note;
    aiNarration.textContent = story.aiNarration;
    
    // Reset note editing state
    exitNoteEditMode();
    
    storyDetailModal.classList.remove('hidden');
}

function closeDetailModalHandler() {
    storyDetailModal.classList.add('hidden');
    currentStoryIndex = null;
    exitNoteEditMode();
}

// Note editing functions
function toggleNoteEdit() {
    const isEditing = !detailNoteEdit.classList.contains('hidden');
    
    if (isEditing) {
        exitNoteEditMode();
    } else {
        enterNoteEditMode();
    }
}

function enterNoteEditMode() {
    if (currentStoryIndex === null) return;
    
    const story = stories[currentStoryIndex];
    detailNoteEdit.value = story.note;
    
    detailNote.classList.add('hidden');
    detailNoteEdit.classList.remove('hidden');
    noteSaveActions.classList.remove('hidden');
    editNoteBtn.classList.add('active');
    
    detailNoteEdit.focus();
}

function exitNoteEditMode() {
    detailNote.classList.remove('hidden');
    detailNoteEdit.classList.add('hidden');
    noteSaveActions.classList.add('hidden');
    editNoteBtn.classList.remove('active');
}

function cancelNoteEditHandler() {
    exitNoteEditMode();
}

async function saveNoteEditHandler() {
    if (currentStoryIndex === null) return;
    
    const newNote = detailNoteEdit.value.trim();
    if (!newNote) {
        alert('Please enter a note for this moment.');
        return;
    }
    
    const story = stories[currentStoryIndex];
    story.note = newNote;
    
    // Show loading state
    saveNoteEdit.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    saveNoteEdit.disabled = true;
    aiNarration.textContent = 'Generating your meditation...';
    
    try {
        // Regenerate AI narration based on new note using OpenAI
        story.aiNarration = await generateOpenAINarration(newNote, story.image);
    } catch (error) {
        console.error('OpenAI failed, using fallback:', error);
        story.aiNarration = generateAIStory(newNote);
    }
    
    // Update display
    detailNote.textContent = newNote;
    aiNarration.textContent = story.aiNarration;
    
    // Restore button
    saveNoteEdit.innerHTML = 'Save Note';
    saveNoteEdit.disabled = false;
    
    // Save and update
    saveStories();
    renderStories();
    updateNarrationPanel();
    
    exitNoteEditMode();
    
    // Show success notification
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
        <i class="fas fa-check"></i>
        <span>Note saved!</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

async function regenerateAIStory() {
    if (currentStoryIndex !== null) {
        const story = stories[currentStoryIndex];
        
        // Show loading state
        const icon = regenerateStory.querySelector('i');
        const originalClass = icon.className;
        icon.className = 'fas fa-spinner fa-spin';
        regenerateStory.disabled = true;
        aiNarration.textContent = 'Regenerating your meditation...';
        
        try {
            // Try OpenAI first
            story.aiNarration = await generateOpenAINarration(story.note, story.image);
        } catch (error) {
            console.error('OpenAI regeneration failed, using fallback:', error);
            story.aiNarration = generateAIStory(story.note);
        }
        
        aiNarration.textContent = story.aiNarration;
        saveStories();
        
        // Restore button
        icon.className = originalClass;
        regenerateStory.disabled = false;
        icon.style.transform = 'rotate(360deg)';
        setTimeout(() => {
            icon.style.transform = 'rotate(0deg)';
        }, 400);
    }
}

// Delete current story
function deleteCurrentStory() {
    if (currentStoryIndex !== null) {
        const confirmDelete = confirm('Are you sure you want to delete this moment? This cannot be undone.');
        if (confirmDelete) {
            stories.splice(currentStoryIndex, 1);
            saveStories();
            closeDetailModalHandler();
            renderStories();
            updateNarrationPanel();
            
            // Re-analyze theme after deletion
            analyzeImagesAndSetTheme();
        }
    }
}

// Replace current photo (clears note too)
function replaceCurrentPhoto() {
    if (currentStoryIndex !== null) {
        const indexToReplace = currentStoryIndex;
        
        // Create a temporary file input
        const tempInput = document.createElement('input');
        tempInput.type = 'file';
        tempInput.accept = 'image/*';
        
        tempInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Close detail modal
                    storyDetailModal.classList.add('hidden');
                    
                    // Set the new image for the upload modal
                    selectedImage = event.target.result;
                    selectedFilename = file.name;
                    
                    // Open upload modal with the new image
                    uploadModal.classList.remove('hidden');
                    uploadPlaceholder.classList.add('hidden');
                    imagePreview.classList.remove('hidden');
                    imagePreview.src = selectedImage;
                    imageNote.value = ''; // Clear the note for a fresh start
                    
                    // Temporarily override save button for replacement
                    const originalSaveHandler = saveNewStory;
                    
                    const replacementHandler = () => {
                        if (!selectedImage) return;
                        
                        const note = imageNote.value.trim() || 'A moment in time...';
                        
                        // Update the existing story
                        stories[indexToReplace].image = selectedImage;
                        stories[indexToReplace].note = note;
                        stories[indexToReplace].filename = selectedFilename;
                        stories[indexToReplace].aiNarration = generateAIStory(note);
                        
                        saveStories();
                        renderStories();
                        closeUploadModalHandler();
                        updateNarrationPanel();
                        
                        // Re-analyze theme
                        analyzeImagesAndSetTheme();
                        
                        // Restore original save handler
                        saveStory.removeEventListener('click', replacementHandler);
                        saveStory.addEventListener('click', originalSaveHandler);
                    };
                    
                    // Swap the click handler
                    saveStory.removeEventListener('click', saveNewStory);
                    saveStory.addEventListener('click', replacementHandler);
                };
                reader.readAsDataURL(file);
            }
        };
        
        tempInput.click();
    }
}

// Set narration start point
function setNarrationStartPoint(index) {
    narrationStartChapter = index;
    
    // Update visual indicators
    document.querySelectorAll('.story-point').forEach((sp, i) => {
        sp.classList.toggle('start-point', i === index);
    });
    
    // Update narration panel to show starting point
    updateNarrationPanel();
    
    // Show confirmation
    showStartPointNotification(index + 1);
}

function showStartPointNotification(partNum) {
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
        <i class="fas fa-play-circle"></i>
        <span>Narration will start from <strong>Part ${partNum}</strong></span>
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Narration panel
function updateNarrationPanel() {
    if (stories.length === 0) {
        narrationContent.innerHTML = '<p>Your story will appear here as you add moments...</p>';
        return;
    }

    let fullStory = '';
    if (narrationStartChapter > 0) {
        fullStory += `<p style="color: var(--accent-color); font-size: 12px; margin-bottom: 10px;"><i class="fas fa-forward"></i> Starting from part ${narrationStartChapter + 1}</p>`;
    }
    stories.forEach((story, index) => {
        const isStartPoint = index === narrationStartChapter;
        const isPastStart = index >= narrationStartChapter;
        fullStory += `<div style="opacity: ${isPastStart ? 1 : 0.4}; margin-bottom: 12px; ${isStartPoint ? 'border-left: 3px solid var(--accent-color); padding-left: 10px;' : ''}">${story.aiNarration}</div>`;
    });
    
    narrationContent.innerHTML = fullStory;
}

// Audio controls
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
}

// Stop narration completely
function stopNarrationCompletely() {
    stopAudio();
    stopChapterTracking();
    isNarrationPaused = false;
    currentChapterIndex = -1;
    narrationSegments = [];
    playNarration.innerHTML = '<i class="fas fa-play"></i><span>Play Narration</span>';
    playNarration.onclick = playStoryNarration;
    narrationContent.innerHTML = '<p style="color: var(--text-light); font-style: italic;">Click play to hear your story narrated...</p>';
}

// Strip out any stage directions like [laughs], [sarcasm], *sigh*, etc.
function cleanNarrationText(text) {
    return text
        .replace(/\[.*?\]/g, '')      // Remove [brackets]
        .replace(/\*[^*]+\*/g, '')    // Remove *asterisks*
        .replace(/\s{2,}/g, ' ')      // Clean up multiple spaces
        .trim();
}

// Build narration segments for tracking
let narrationSegments = [];
let currentChapterIndex = -1;

// Play narration with immersive fullscreen meditation experience
async function playStoryNarration() {
    stopAudio();
    
    // Get stories to narrate (from start chapter onwards)
    const startIndex = narrationStartChapter;
    const storiesToNarrate = stories.slice(startIndex);
    
    if (storiesToNarrate.length === 0) {
        alert('No chapters to narrate from this point.');
        return;
    }
    
    const titleText = storyTitle.value || 'My Journey';
    
    // Show loading state
    playNarration.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Creating your meditation...</span>';
    playNarration.classList.add('loading');
    
    // Get meditation viewer elements (but don't show yet)
    const meditationViewer = document.getElementById('meditationViewer');
    const meditationImage = document.getElementById('meditationImage');
    const meditationImageNext = document.getElementById('meditationImageNext');
    const meditationText = document.getElementById('meditationText');
    const meditationProgressBar = document.getElementById('meditationProgressBar');
    const currentMomentNum = document.getElementById('currentMomentNum');
    const totalMomentsNum = document.getElementById('totalMomentsNum');
    
    // Pre-load the first image but don't show viewer yet
    meditationImage.src = storiesToNarrate[0].image;
    meditationText.textContent = ''; // No text display
    totalMomentsNum.textContent = storiesToNarrate.length;
    currentMomentNum.textContent = '1';
    
    try {
        // Generate unified meditation script using OpenAI
        console.log('Generating unified meditation script for', storiesToNarrate.length, 'moments...');
        const segments = await generateUnifiedMeditationScript(storiesToNarrate, titleText);
        
        if (!segments || segments.length === 0) {
            throw new Error('Failed to generate meditation script');
        }
        
        meditationSegments = segments;
        console.log('Generated', segments.length, 'meditation segments');
        
        // Build the full narration text for ElevenLabs
        let fullNarrationText = `${titleText}. <break time="1.2s"/>`;
        
        segments.forEach((segment, index) => {
            if (segment.type === 'moment') {
                if (index > 0) {
                    fullNarrationText += '<break time="2s"/>';
                }
                fullNarrationText += segment.text + ' <break time="1.5s"/>';
            } else if (segment.type === 'closing') {
                fullNarrationText += '<break time="2s"/>' + segment.text;
            }
        });
        
        // Calculate timing for each segment (rough estimate based on character count)
        const totalChars = fullNarrationText.replace(/<[^>]*>/g, '').length;
        let runningChars = titleText.length;
        
        segments.forEach((segment, index) => {
            const segmentChars = segment.text.replace(/<[^>]*>/g, '').length;
            segment.startPercent = runningChars / totalChars;
            runningChars += segmentChars;
            segment.endPercent = runningChars / totalChars;
            segment.storyIndex = startIndex + segment.momentIndex;
        });
        
        // Don't show text - keep it clean
        meditationText.textContent = '';
        meditationText.style.display = 'none';
        
        // Generate audio with ElevenLabs
        if (!elevenLabsApiKey) {
            playMeditationWithBrowserSpeech(fullNarrationText, segments, storiesToNarrate, startIndex);
            return;
        }
        
        const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + ELEVENLABS_VOICE_ID, {
            method: 'POST',
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': elevenLabsApiKey
            },
            body: JSON.stringify({
                text: fullNarrationText,
                model_id: 'eleven_multilingual_v2',
                voice_settings: {
                    stability: 0.20,
                    similarity_boost: 0.65,
                    style: 0.90,
                    use_speaker_boost: true
                }
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail?.message || 'ElevenLabs API error: ' + response.status);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        meditationAudio = new Audio(audioUrl);
        meditationAudio.preload = 'auto';
        
        // Wait for audio to be fully loaded before doing anything
        await new Promise((resolve, reject) => {
            meditationAudio.oncanplaythrough = resolve;
            meditationAudio.onerror = (e) => reject(new Error('Audio load error'));
            meditationAudio.load();
        });
        
        // Audio is ready - show viewer with a start button (for browser autoplay policy)
        meditationViewer.classList.remove('hidden');
        meditationImage.classList.add('zooming');
        
        // Show a "Tap to Begin" overlay that user must click (satisfies browser autoplay policy)
        const startOverlay = document.createElement('div');
        startOverlay.id = 'meditationStartOverlay';
        startOverlay.innerHTML = `
            <div class="meditation-start-prompt">
                <i class="fas fa-play-circle"></i>
                <p>Tap to Begin Your Meditation</p>
            </div>
        `;
        startOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.6);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100;
            cursor: pointer;
        `;
        startOverlay.querySelector('.meditation-start-prompt').style.cssText = `
            text-align: center;
            color: white;
            font-family: 'Quicksand', sans-serif;
        `;
        startOverlay.querySelector('i').style.cssText = `
            font-size: 80px;
            margin-bottom: 20px;
            display: block;
            opacity: 0.9;
        `;
        startOverlay.querySelector('p').style.cssText = `
            font-size: 22px;
            font-weight: 500;
        `;
        
        meditationViewer.appendChild(startOverlay);
        
        // Update button state
        playNarration.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
        playNarration.classList.remove('loading');
        playNarration.onclick = closeMeditationViewer;
        
        // Wait for user to tap the overlay (satisfies autoplay policy)
        startOverlay.onclick = async () => {
            startOverlay.remove();
            
            try {
                await meditationAudio.play();
                // Start tracking for image transitions
                startMeditationTracking(segments, storiesToNarrate, startIndex);
            } catch (e) {
                console.error('Play error:', e);
                closeMeditationViewer();
                alert('Could not play audio. Please try again.');
            }
        };
        
        meditationAudio.onended = () => {
            // Meditation complete - close after a moment
            meditationProgressBar.style.width = '100%';
            
            setTimeout(() => {
                closeMeditationViewer();
            }, 2000);
        };
        
    } catch (error) {
        console.error('Meditation generation error:', error);
        closeMeditationViewer();
        playNarration.classList.remove('loading');
        playNarration.innerHTML = '<i class="fas fa-play"></i><span>Play Narration</span>';
        playNarration.onclick = playStoryNarration;
        alert('Error creating meditation: ' + error.message);
    }
}

// Track meditation progress and transition images
function startMeditationTracking(segments, storiesToNarrate, startIndex) {
    const meditationImage = document.getElementById('meditationImage');
    const meditationImageNext = document.getElementById('meditationImageNext');
    const meditationText = document.getElementById('meditationText');
    const meditationProgressBar = document.getElementById('meditationProgressBar');
    const currentMomentNum = document.getElementById('currentMomentNum');
    
    currentMeditationSegment = 0;
    
    meditationTrackingInterval = setInterval(() => {
        if (!meditationAudio) return;
        
        const progress = meditationAudio.currentTime / meditationAudio.duration;
        meditationProgressBar.style.width = (progress * 100) + '%';
        
        // Find which segment we're in
        for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            if (progress >= segment.startPercent && progress < segment.endPercent) {
                if (i !== currentMeditationSegment) {
                    currentMeditationSegment = i;
                    
                    // Text is hidden - no update needed
                    
                    // Transition to new image if it's a moment segment
                    if (segment.type === 'moment' && segment.momentIndex < storiesToNarrate.length) {
                        const storyIdx = segment.momentIndex;
                        const newImage = storiesToNarrate[storyIdx].image;
                        
                        currentMomentNum.textContent = storyIdx + 1;
                        
                        // Smooth crossfade transition
                        meditationImageNext.src = newImage;
                        meditationImageNext.classList.add('fade-in');
                        meditationImage.classList.add('fade-out');
                        meditationImage.classList.remove('zooming');
                        
                        setTimeout(() => {
                            meditationImage.src = newImage;
                            meditationImage.classList.remove('fade-out');
                            meditationImageNext.classList.remove('fade-in');
                            
                            // Restart zoom effect
                            setTimeout(() => meditationImage.classList.add('zooming'), 100);
                        }, 1500);
                    }
                }
                break;
            }
        }
    }, 200);
}

// Play meditation with browser speech (fallback)
function playMeditationWithBrowserSpeech(text, segments, storiesToNarrate, startIndex) {
    if (!('speechSynthesis' in window)) {
        closeMeditationViewer();
        alert('Speech not supported in this browser.');
        return;
    }
    
    const meditationText = document.getElementById('meditationText');
    const meditationProgressBar = document.getElementById('meditationProgressBar');
    const meditationImage = document.getElementById('meditationImage');
    const currentMomentNum = document.getElementById('currentMomentNum');
    
    window.speechSynthesis.cancel();
    const plainText = text.replace(/<break[^>]*>/g, '... ');
    const utterance = new SpeechSynthesisUtterance(plainText);
    utterance.rate = 0.80;
    utterance.pitch = 1;
    
    // Simplified tracking for browser speech
    let segmentIndex = 0;
    const segmentDuration = 8000; // Rough estimate per segment
    
    const trackingInterval = setInterval(() => {
        segmentIndex++;
        if (segmentIndex < segments.length) {
            const segment = segments[segmentIndex];
            meditationText.textContent = segment.text;
            meditationProgressBar.style.width = ((segmentIndex + 1) / segments.length * 100) + '%';
            
            if (segment.type === 'moment' && segment.momentIndex < storiesToNarrate.length) {
                meditationImage.src = storiesToNarrate[segment.momentIndex].image;
                currentMomentNum.textContent = segment.momentIndex + 1;
            }
        }
    }, segmentDuration);
    
    utterance.onend = () => {
        clearInterval(trackingInterval);
        meditationText.textContent = '✨ Thank you for this journey through your memories ✨';
        meditationProgressBar.style.width = '100%';
        
        setTimeout(() => {
            closeMeditationViewer();
        }, 4000);
    };
    
    window.speechSynthesis.speak(utterance);
    
    playNarration.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>';
    playNarration.classList.remove('loading');
    playNarration.onclick = closeMeditationViewer;
}

// Close meditation viewer
function closeMeditationViewer() {
    const meditationViewer = document.getElementById('meditationViewer');
    const meditationImage = document.getElementById('meditationImage');
    
    // Stop audio
    if (meditationAudio) {
        meditationAudio.pause();
        meditationAudio = null;
    }
    
    // Stop browser speech
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    // Clear tracking
    if (meditationTrackingInterval) {
        clearInterval(meditationTrackingInterval);
        meditationTrackingInterval = null;
    }
    
    // Reset classes
    meditationImage.classList.remove('zooming', 'fade-out');
    document.getElementById('meditationImageNext').classList.remove('fade-in');
    
    // Hide viewer
    meditationViewer.classList.add('hidden');
    
    // Reset play button
    playNarration.innerHTML = '<i class="fas fa-play"></i><span>Play Narration</span>';
    playNarration.classList.remove('loading');
    playNarration.onclick = playStoryNarration;
    
    // Reset progress bar in viewer
    document.getElementById('meditationProgressBar').style.width = '0%';
}

// Browser speech fallback
function useBrowserSpeech(text) {
    if (!('speechSynthesis' in window)) {
        alert('Speech not supported in this browser.');
        return;
    }
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.85;
    utterance.pitch = 1;
    
    playNarration.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
    isNarrationPaused = false;
    
    // Start tracking for browser speech too
    startChapterTracking();
    
    utterance.onend = () => {
        playNarration.innerHTML = '<i class="fas fa-play"></i><span>Play Again</span>';
        playNarration.onclick = playStoryNarration;
        isNarrationPaused = false;
        stopChapterTracking();
        narrationContent.innerHTML = `
            <div style="text-align: center;">
                <p style="font-size: 16px; margin-bottom: 8px;">✨ <strong>Story Complete</strong> ✨</p>
                <p style="color: var(--text-light);">Thank you for listening to your journey.</p>
            </div>
        `;
    };
    
    window.speechSynthesis.speak(utterance);
    
    playNarration.onclick = () => {
        toggleSpeechPause();
    };
}

// Update narration display with current chapter
function updateNarrationDisplay(segmentIndex) {
    if (segmentIndex < 0 || segmentIndex >= narrationSegments.length) return;
    
    const segment = narrationSegments[segmentIndex];
    currentChapterIndex = segmentIndex;
    
    let html = '';
    
    if (segment.type === 'intro') {
        html = `
            <div class="narration-segment active">
                <div class="segment-title" style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">
                    ${segment.text}
                </div>
                <p style="font-style: italic; color: var(--text-light);">${segment.displayText}</p>
            </div>
        `;
    } else if (segment.type === 'chapter') {
        html = `
            <div class="narration-segment active">
                <div class="segment-title" style="font-weight: 700; color: var(--accent-color); margin-bottom: 8px; font-size: 13px;">
                    🎙️ Now Playing: ${segment.text}
                </div>
                <p style="line-height: 1.8;">"${segment.displayText}"</p>
            </div>
        `;
    } else if (segment.type === 'outro') {
        html = `
            <div class="narration-segment active">
                <div class="segment-title" style="font-weight: 700; color: var(--primary-color); margin-bottom: 8px;">
                    ${segment.text}
                </div>
                <p style="font-style: italic; color: var(--text-light);">${segment.displayText}</p>
            </div>
        `;
    }
    
    narrationContent.innerHTML = html;
}

// Chapter tracking interval
let chapterTrackingInterval = null;

function startChapterTracking() {
    if (chapterTrackingInterval) clearInterval(chapterTrackingInterval);
    
    if (!currentAudio || narrationSegments.length === 0) return;
    
    chapterTrackingInterval = setInterval(() => {
        if (!currentAudio || currentAudio.paused) return;
        
        const currentTime = currentAudio.currentTime;
        const duration = currentAudio.duration;
        
        if (!duration || isNaN(duration)) return;
        
        // Calculate progress as percentage
        const progress = currentTime / duration;
        
        // Find which segment we're in based on percentage boundaries
        let newSegmentIndex = 0;
        for (let i = 0; i < narrationSegments.length; i++) {
            const seg = narrationSegments[i];
            if (progress >= seg.startPercent && progress < seg.endPercent) {
                newSegmentIndex = i;
                break;
            }
            // Handle the last segment
            if (i === narrationSegments.length - 1 && progress >= seg.startPercent) {
                newSegmentIndex = i;
            }
        }
        
        if (newSegmentIndex !== currentChapterIndex) {
            updateNarrationDisplay(newSegmentIndex);
        }
    }, 250); // Check more frequently for better sync
}

function stopChapterTracking() {
    if (chapterTrackingInterval) {
        clearInterval(chapterTrackingInterval);
        chapterTrackingInterval = null;
    }
}

// Toggle pause/resume for ElevenLabs audio
function toggleAudioPause() {
    if (!currentAudio) return;
    
    if (isNarrationPaused) {
        currentAudio.play();
        playNarration.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
        isNarrationPaused = false;
    } else {
        currentAudio.pause();
        playNarration.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
        isNarrationPaused = true;
    }
}

// Toggle pause/resume for browser speech
function toggleSpeechPause() {
    if (isNarrationPaused) {
        window.speechSynthesis.resume();
        playNarration.innerHTML = '<i class="fas fa-pause"></i><span>Pause</span>';
        isNarrationPaused = false;
    } else {
        window.speechSynthesis.pause();
        playNarration.innerHTML = '<i class="fas fa-play"></i><span>Resume</span>';
        isNarrationPaused = true;
    }
}

// ===== DRAFTS FUNCTIONALITY =====

// Open drafts modal
function openDraftsModal() {
    renderDraftsList();
    draftsModal.classList.remove('hidden');
}

// Close drafts modal
function closeDraftsModalHandler() {
    draftsModal.classList.add('hidden');
}

// Load drafts from Firestore/localStorage
async function loadDrafts() {
    if (!currentUser) {
        drafts = [];
        return;
    }
    
    // Try to load from Firestore first
    try {
        const firestoreDrafts = await loadDraftsFromFirestore(currentUser);
        if (firestoreDrafts && firestoreDrafts.length > 0) {
            drafts = firestoreDrafts;
            console.log('Loaded', drafts.length, 'drafts from Firestore');
            return;
        }
    } catch (error) {
        console.error('Error loading drafts from Firestore:', error);
    }
    
    // Fallback to localStorage
    const key = 'storifyDrafts_' + currentUser;
    const savedDrafts = localStorage.getItem(key);
    
    if (savedDrafts) {
        try {
            drafts = JSON.parse(savedDrafts);
            // Sync to Firestore if found local drafts
            if (drafts.length > 0) {
                saveDraftsToFirestore(currentUser, drafts).catch(err => {
                    console.error('Error syncing drafts to Firestore:', err);
                });
            }
        } catch (e) {
            console.error('Error loading drafts:', e);
            drafts = [];
        }
    } else {
        drafts = [];
    }
}

// Save drafts to Firestore/localStorage
function saveDrafts() {
    if (!currentUser) return;
    const key = 'storifyDrafts_' + currentUser;
    try {
        // Save to localStorage for offline support
        localStorage.setItem(key, JSON.stringify(drafts));
        
        // Save to Firestore (async, non-blocking)
        saveDraftsToFirestore(currentUser, drafts).then(() => {
            console.log('Drafts synced to Firestore');
        }).catch(err => {
            console.error('Error syncing drafts to Firestore:', err);
        });
    } catch (e) {
        console.error('Error saving drafts:', e);
        if (e.name === 'QuotaExceededError') {
            alert('Storage is full! Try deleting some drafts.');
        }
    }
}

// Save current story as a draft
function saveCurrentAsDraft() {
    if (stories.length === 0) {
        showNotification('fa-exclamation-circle', 'Add some memories first!', '#e74c3c');
        return;
    }
    
    // Prompt for draft name
    const defaultName = storyTitle.value || 'Untitled Story';
    const draftName = prompt('Give this draft a name:', defaultName);
    
    if (draftName === null) return; // User cancelled
    
    const newDraft = {
        id: Date.now(),
        name: draftName.trim() || 'Untitled Story',
        title: storyTitle.value,
        stories: JSON.parse(JSON.stringify(stories)), // Deep copy
        createdAt: new Date().toISOString(),
        momentCount: stories.length
    };
    
    drafts.unshift(newDraft); // Add to beginning
    saveDrafts();
    renderDraftsList();
    
    showNotification('fa-save', `Draft "${newDraft.name}" saved!`, '#4A7C6F');
}

// Start a fresh new story
function startFreshStory() {
    if (stories.length > 0) {
        const confirmNew = confirm('Starting fresh will clear your current story. Save it as a draft first?');
        if (confirmNew) {
            saveCurrentAsDraft();
        }
    }
    
    // Clear current story
    stories = [];
    storyTitle.value = '';
    saveStories();
    saveStoryTitle();
    renderStories();
    updateNarrationPanel();
    narrationPanel.classList.add('hidden');
    closeDraftsModalHandler();
    
    // Reset theme
    applyTheme('mountain');
    
    showNotification('fa-sparkles', 'Ready for a new adventure!', '#E8B86D');
}

// Load a draft
function loadDraft(draftId) {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    
    // Ask if user wants to save current first
    if (stories.length > 0) {
        const saveCurrent = confirm('Do you want to save your current story as a draft before loading?');
        if (saveCurrent) {
            saveCurrentAsDraft();
        }
    }
    
    // Load the draft
    stories = JSON.parse(JSON.stringify(draft.stories)); // Deep copy
    storyTitle.value = draft.title || '';
    
    saveStories();
    saveStoryTitle();
    renderStories();
    updateNarrationPanel();
    
    if (stories.length > 0) {
        narrationPanel.classList.remove('hidden');
        setTimeout(() => analyzeImagesAndSetTheme(), 200);
    }
    
    closeDraftsModalHandler();
    showNotification('fa-folder-open', `Loaded "${draft.name}"`, '#4A7C6F');
}

// Delete a draft
function deleteDraft(draftId) {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;
    
    const confirmDelete = confirm(`Delete draft "${draft.name}"? This cannot be undone.`);
    if (!confirmDelete) return;
    
    drafts = drafts.filter(d => d.id !== draftId);
    saveDrafts();
    renderDraftsList();
    
    showNotification('fa-trash', 'Draft deleted', '#e74c3c');
}

// Render the drafts list
function renderDraftsList() {
    if (drafts.length === 0) {
        draftsList.innerHTML = `
            <div class="drafts-empty">
                <i class="fas fa-folder-open"></i>
                <p>No saved drafts yet.<br>Save your current story to create one!</p>
            </div>
        `;
        return;
    }
    
    draftsList.innerHTML = drafts.map(draft => {
        // Get thumbnails (up to 3)
        const thumbs = draft.stories.slice(0, 3);
        const extraCount = draft.stories.length - 3;
        
        const thumbnailsHtml = thumbs.map((story, i) => 
            `<img src="${story.image}" class="draft-thumb" alt="Thumbnail">`
        ).join('');
        
        const extraHtml = extraCount > 0 ? 
            `<div class="draft-thumb-more">+${extraCount}</div>` : '';
        
        const date = new Date(draft.createdAt);
        const dateStr = date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: date.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
        });
        
        return `
            <div class="draft-item" data-id="${draft.id}">
                <div class="draft-thumbnails">
                    ${thumbnailsHtml}
                    ${extraHtml}
                </div>
                <div class="draft-info">
                    <div class="draft-title">${escapeHtml(draft.name)}</div>
                    <div class="draft-meta">${draft.momentCount} moments • ${dateStr}</div>
                </div>
                <div class="draft-actions">
                    <button class="draft-load-btn" onclick="loadDraft(${draft.id})" title="Load this draft">
                        <i class="fas fa-upload"></i>
                    </button>
                    <button class="draft-delete-btn" onclick="deleteDraft(${draft.id})" title="Delete draft">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Helper to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification helper
function showNotification(icon, message, color = '#4A7C6F') {
    const notification = document.createElement('div');
    notification.className = 'theme-notification';
    notification.innerHTML = `
        <i class="fas ${icon}" style="color: ${color}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(notification);
    setTimeout(() => notification.classList.add('show'), 100);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// Shake animation style
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

// Resize handler
window.addEventListener('resize', () => {
    if (stories.length > 0) {
        renderStories();
    }
});

// Initialize
init();
