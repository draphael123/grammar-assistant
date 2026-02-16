# LinguistAI

A Chrome Extension (Manifest V3) that checks grammar and spelling in real-time as you type on any webpage.

## Features

- **Real-time checking** on textareas and contenteditable elements
- **Red underlines** for potential errors
- **Shadow DOM tooltips** on hover with suggested correction, explanation, and Accept button
- **Popup** to toggle the extension and view Total Corrections stats
- **Mock API** (500ms delay) ready to swap for a real LLM (OpenAI, Gemini, etc.)

## Installation

**Option A — Download from the website**  
Visit the landing page and click **Add to Chrome** or **Download LinguistAI.zip**. Extract the zip, then:

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** and select the extracted folder

**Option B — From source**  
1. Clone the repo and run `npm run zip` to create `extension.zip`, or use the `extension` folder directly
2. Open Chrome → `chrome://extensions` → Enable Developer mode → Load unpacked → Select the `extension` folder

## Project Structure

```
extension/
├── manifest.json    # Manifest V3 config
├── background.js    # Service worker
├── content.js       # Monitors textareas & contenteditable
├── api.js           # Mock API (replace with LLM call)
├── styles.css       # Error underline styles
├── popup.html       # Extension popup
└── popup.js         # Popup logic

landing/
└── index.html       # Landing page
```

## Landing Page

To view the landing page locally:

```bash
cd landing
npx serve .
# or: python -m http.server 3000
```

Then open `http://localhost:3000` (or `http://localhost:3000` for Python).

## Adding a Real API

Edit `extension/api.js` and replace the `checkGrammar` function with your LLM integration. The function should:

- Accept `text` (string)
- Return a Promise resolving to an array of:
  ```js
  { original, suggestion, explanation, startIndex, endIndex }
  ```

## Try It

1. Install the extension
2. Visit any page with a textarea (e.g. Gmail compose, Twitter, or the demo on the landing page)
3. Type common errors like "teh", "recieve", or "definately"
4. Hover over underlined text to see suggestions and Accept
