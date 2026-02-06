# RPG Sheet Parser

A specialized frontend tool designed to parse HTML character sheets into structured JSON data. This parser operates entirely client-side using deterministic algorithms (RegEx and DOM traversal), ensuring consistent results without the need for AI processing.

It is specifically tuned to extract RPG data such as stats, inventory, and abilities from formatted HTML text (e.g., from forum posts or CMS articles) and categorize them into a standardized JSON schema.

## Features

- **Smart HTML Parsing**: Extracts character data from raw HTML content.
- **Profile Extraction**: Automatically detects Name, Level, Faction, and Attributes (Physical, Magic, Unique).
- **Auto-Categorization**:
  - Intelligently sorts abilities into **Passive** and **Active** groups.
  - Detects Cooldowns (CD) to distinguish active skills from passive traits automatically.
- **Tag Generation**: Automatically assigns semantic tags (e.g., `fire`, `defense`, `aoe`, `sword`) based on keywords in the lore and mechanics text.
- **Structural Editor**:
  - Rename, Create, and Delete ability groups.
  - Drag-and-drop style reorganization (via dropdowns) to move items between groups.
  - Edit global stats and profile details directly.
- **JSON Export**: Generates a clean, portable JSON structure ready for use in VTTs (Virtual Tabletop) or game engines.

## Algorithm Overview

The parser (`utils/parser.ts`) works in several passes:
1. **DOM Parsing**: Converts the input string into a DOM structure.
2. **Section Detection**: Scans for headers (`H1`-`H4`, `CITE`) to determine current context (Abilities, Equipment, Debuffs).
3. **Item Extraction**: Parses `Blockquotes` as item names and subsequent paragraphs as descriptions.
4. **Stat & Tag Analysis**: Uses Regex to find bonuses (e.g., "+15 Strength") and maps keywords to a predefined list of tags.
5. **Post-Processing**: Re-evaluates "Passive" items; if a Cooldown is detected, the item is automatically moved to an "Active" group.

## Local Development

This project is built with **React**, **TypeScript**, and **Vite**.

### Prerequisites

- [Node.js](https://nodejs.org/) (Version 16+ recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/rpg-sheet-parser.git
   cd rpg-sheet-parser
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Open your browser and navigate to `http://localhost:5173` (or the port shown in your terminal).

### Building for Production

To create a static build for deployment:

```bash
npm run build
```

The output will be in the `dist` folder.

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite

## License

MIT

