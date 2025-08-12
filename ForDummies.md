# DHIS2 MCP For Dummies (A very friendly guide)

This guide is for someone brand-new to coding, Cursor, and DHIS2. Follow the steps exactly. Copy and paste where told. If anything feels confusing, don’t worry—just do the next step.

## What you’re about to do
- Use Cursor (an AI coding editor) + this DHIS2 MCP “helper” to build a DHIS2 app with almost no code knowledge.
- Click buttons → MCP runs specialized DHIS2 tools → You get ready-to-use app snippets.

## 0) What you need (once)
- A Mac with internet
- Node.js 18 or newer
- Git

### Install Node.js 18 (recommended)
```bash
# Install Homebrew if you don’t have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 18
brew install node@18

# Make sure Node is on 18+
node -v
```

## 1) Get the DHIS2 MCP on your computer
```bash
# Pick a folder you like and open Terminal
cd ~/Documents

# Download the project
git clone https://github.com/yourusername/dhis2-mcp.git
cd dhis2-mcp

# Install and build (first time takes a bit)
npm install
npm run build
```

## 2) Start the MCP “helper”
You have two easy options. Either one is fine.

### Option A (recommended): Let Cursor launch it for you
1. Open Cursor
2. Go to Settings → MCP (Model Context Protocol) → Add Server (or “Custom Server”)
3. Fill it in:
   - Name: `dhis2-mcp`
   - Command: `node`
   - Args: `dist/index.js`
   - Working directory: the folder you cloned, e.g. `/Users/yourname/Documents/dhis2-mcp`
4. Save. You should see `dhis2-mcp` in Cursor’s Tools list for your chats.

### Option B: Run it manually (works too)
```bash
# In the project folder
npm start
```
Leave that Terminal window open. In Cursor, open a chat and make sure the tool `dhis2-mcp` is available.

## 3) Connect to a DHIS2 server (the demo one)
We’ll use the public demo server so you don’t need to set up anything.
- Base URL: `https://play.dhis2.org/2.40.4`
- Username: `admin`
- Password: `district`

In Cursor:
1. Open a chat
2. Make sure the tool `dhis2-mcp` is enabled for that chat
3. Run the tool named `dhis2_configure`
4. Fill the boxes:
   - `baseUrl`: `https://play.dhis2.org/2.40.4`
   - `username`: `admin`
   - `password`: `district`
5. Run it. You should get “Successfully connected …”

If it fails, check your internet, then try again.

## 4) Create your DHIS2 web app (the fastest way)
We’ll scaffold a DHIS2 app using official tooling.

In Terminal (not in Cursor):
```bash
# In a separate folder where you keep projects
cd ~/Documents

# Create a new DHIS2 app (you’ll be asked a few simple questions)
npx @dhis2/cli-app-scripts init my-health-app
cd my-health-app

# Start the dev server
yarn install
yarn start
```
This opens a browser tab at your local app. Keep it running.

## 5) Add smart UI pieces from the MCP
Now, we’ll ask the MCP to generate ready-to-copy UI components and configuration that match DHIS2 best practices.

In Cursor (chat with `dhis2-mcp` tools):
- Generate a form (names, dates, file upload, validation):
  - Run: `dhis2_generate_ui_form_patterns`
  - Example options to fill:
    - `componentName`: `DataElementForm`
    - `includeValidation`: `true`
    - `includeDatePicker`: `true`
    - `includeFileUpload`: `true`
    - `includeMultiSelect`: `true`
- Generate a data table + cards + modal (with loading and empty states):
  - Run: `dhis2_generate_ui_data_display`
  - Example:
    - `componentName`: `DataElementDisplay`
    - `includeTable`: `true`
    - `includePagination`: `true`
    - `includeCards`: `true`
    - `includeModal`: `true`
- Generate navigation layout (header, sidebar, breadcrumbs, tabs):
  - Run: `dhis2_generate_ui_navigation_layout`
  - Example:
    - `componentName`: `AppLayout`
    - `includeHeaderBar`: `true`
    - `includeSidebar`: `true`
    - `includeBreadcrumbs`: `true`
    - `includeTabs`: `true`
- Generate design-system tokens (colors, fonts, spacing, dark mode):
  - Run: `dhis2_generate_design_system`
  - Example:
    - `theme`: `default`
    - `enableDarkMode`: `true`

Each tool returns a Markdown page. Copy the code blocks into your app:
- Components: put in `src/components/YourName.jsx(x)`
- Styles/tokens: keep in a `src/theme/` or similar
- Then import them into `src/App.jsx(x)` and render them

## 6) Make it talk to DHIS2 (no stress)
Your app should use `@dhis2/app-runtime` queries.
Ask the MCP to generate an example for you:
- Run: `dhis2_generate_app_runtime_config`
- Paste the example provider + queries into your app (follow the instructions it prints)
- Keep dev server running (`yarn start`) and check your UI

## 7) Android UI (optional)
If you also want an Android app UI (using Compose):
- Run: `android_generate_material_form` (form with validation/date/multi-select)
- Run: `android_generate_list_adapter` (lists)
- Run: `android_generate_navigation_drawer` (drawer layout)
- Run: `android_generate_bottom_sheet` (bottom sheet)
These output Kotlin/Compose snippets you copy into your Android project.

## 8) What to say to the AI (you can be very simple)
- “Generate a DHIS2 form for creating data elements with name, value type, and validation.”
- “Give me a data table with pagination and loading states.”
- “Add a design system with dark mode and compact spacing.”
- “Help connect my app to DHIS2 Play server and render data elements.”

You don’t need fancy words. Be literal and specific.

## 9) Troubleshooting (common fixes)
- Can’t connect to DHIS2: Check the URL. Try the demo `https://play.dhis2.org/2.40.4` + `admin/district`.
- Dev server shows errors: Stop it and `yarn start` again.
- CORS/auth errors in browser: Ask the MCP tool `dhis2_diagnose_cors_issues` or `dhis2_debug_authentication` with your details. It prints fixes.
- Stuck? Ask the AI: “Explain this error in plain English, and fix it.”

## 10) When you’re ready to share
- Build your app: `yarn build`
- Talk to your DHIS2 admin to install your app package or use DHIS2 App Hub docs for publishing.

## Quick glossary (no pain)
- DHIS2: A platform for health data apps.
- MCP: A helper that gives Cursor superpowers (special tools for DHIS2).
- Tool: A button you click in Cursor that runs something useful (like “make a form”).
- Scaffold: A starter app the computer creates for you.

## You did it 🎉
You can make more screens by running more tools and pasting the code into your app. If you get lost, say: “Walk me through the next step like I’m new.”