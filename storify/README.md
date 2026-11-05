# Storify 📖✨

**Relive Your Memories** — A beautiful, interactive storytelling web app that transforms your photos and memories into narrated stories with AI-powered voice.

![Storify](https://img.shields.io/badge/Version-1.0.0-green)

---

## ✨ Features

### 🎨 Beautiful Visual Experience
- Stunning mountain scenery background with animated clouds and stars
- Curved roadmap timeline displaying your memories as journey points
- Smooth animations and premium UI design
- Fully responsive for all devices

### 📸 Memory Management
- Upload photos to create memory chapters
- Add personal notes to each memory
- Edit notes directly from the story detail view
- Organize memories in a visual timeline

### 🎙️ AI-Powered Narration
- **ElevenLabs Integration** — Professional voice narration using the "Rachel" voice
- Context-aware storytelling that adapts to your memory's emotional tone
- 9 emotion categories: joy, nostalgia, adventure, love, achievement, gratitude, reflection, humor, and peaceful
- Regenerate narration for different storytelling styles

### 📂 Drafts System
- Save multiple collections of memories as drafts
- Load and switch between different story drafts
- Organize your memories into separate journeys

### 🔐 User Authentication
- Secure login and signup system
- Password validation with requirements
- User-specific data storage
- Account management

---

## 🚀 Getting Started

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge)
- Internet connection (for AI voice narration)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Diggy-DB/TellSnap.git
   cd TellSnap/storify/storify
   ```

2. **Start a local server** (Firebase sign-in doesn't work from a `file://` page)
   ```bash
   python3 -m http.server 8080
   ```
   Then open http://localhost:8080.

3. **Add API keys (optional)**
   - Copy `api-config.example.js` to `api-config.js` and add your OpenAI and ElevenLabs keys
   - Without keys, Storify writes narrations locally and reads them with the browser's built-in speech

4. **Create an account**
   - Click "Sign up" on the login page
   - Enter your name, email, and password
   - Start creating your story!

---

## 📁 Project Structure

```
storify/
├── index.html      # Main HTML structure
├── styles.css      # All styling (2000+ lines)
├── app.js          # Application logic (2100+ lines)
└── README.md       # This file
```

---

## 🎯 How to Use

1. **Login/Signup** — Create an account or log in
2. **Name Your Story** — Give your memory collection a title
3. **Add Memories** — Click the + button to upload photos and add notes
4. **View Details** — Click any memory to see the full story with AI narration
5. **Listen** — Play the AI-generated voice narration
6. **Save Drafts** — Use the drafts feature to save multiple story collections

---

## 🛠️ Technologies Used

- **Frontend:** Vanilla HTML, CSS, JavaScript (no frameworks)
- **Fonts:** Google Fonts (Playfair Display, Quicksand)
- **Icons:** Font Awesome
- **Narration AI:** OpenAI GPT-4o (with vision)
- **Voice AI:** ElevenLabs Text-to-Speech API (browser speech as a fallback)
- **Backend:** Firebase Authentication, Cloud Firestore, and Firebase Storage (browser localStorage as a fallback)

---

## 🎨 Design Features

- **Color Palette:**
  - Primary: `#4A7C6F` (Forest Green)
  - Secondary: `#2E5A4C` (Deep Green)
  - Accent: `#E8B86D` (Golden)
  
- **Typography:**
  - Headings: Playfair Display (Serif)
  - Body: Quicksand (Sans-serif)

- **Visual Elements:**
  - Animated mountain scenery background
  - Floating clouds animation
  - Twinkling stars effect
  - Curved SVG path timeline

---

## 🔊 Voice Narration

Storify uses ElevenLabs' professional text-to-speech API with:
- **Voice:** Rachel (warm, natural female voice)
- **Model:** eleven_multilingual_v2
- **Settings:** Optimized for emotional, expressive storytelling

The AI generates context-aware narrations based on the emotional content of your memories.

---

## 📱 Responsive Design

Storify is fully responsive and works beautifully on:
- 💻 Desktop computers
- 💻 Laptops
- 📱 Tablets
- 📱 Mobile phones

---

## 🤝 Contributing

Contributions are welcome! Feel free to:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 👨‍💻 Author

Created with ❤️ for preserving and sharing precious memories.

---

## 🙏 Acknowledgments

- [ElevenLabs](https://elevenlabs.io/) for the amazing voice AI
- [Font Awesome](https://fontawesome.com/) for icons
- [Google Fonts](https://fonts.google.com/) for typography
- [OpenAI](https://openai.com/) for GPT-4o narration
- [Firebase](https://firebase.google.com/) for authentication and storage
