# Surf Time - Browser Time Tracking Extension

A Chrome extension that helps you track and analyze your browsing habits to gain insights about your screen time.

## Features

- Track active browsing time across different websites
- Analyze browsing patterns and habits
- View detailed statistics about your internet usage
- Privacy-focused local data storage
- Beautiful and intuitive user interface built with React and shadcn-ui

## Tech Stack

- **Frontend Framework**: React with TypeScript
- **Build Tool**: Vite
- **UI Components**: shadcn-ui
- **Styling**: Tailwind CSS
- **State Management**: React Query
- **Form Handling**: React Hook Form
- **Data Visualization**: Recharts
- **Chrome Extension APIs**: 
  - Storage API
  - History API
  - Tabs API
  - Windows API

## Installation

1. Clone the repository:
```sh
git clone <repository-url>
cd screen-savvy-soul-searcher
```

2. Install dependencies:
```sh
npm install
```

3. Build the extension:
```sh
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right
   - Click "Load unpacked" and select the `dist` folder from your project directory

## Development

1. Start the development server:
```sh
npm run dev
```

2. For development builds with hot reload:
```sh
npm run build:dev
```

3. Lint the code:
```sh
npm run lint
```

## Project Structure

- `/src` - Main source code
  - `/components` - React components
  - `/hooks` - Custom React hooks
  - `/lib` - Utility functions and shared logic
- `/public` - Static assets and manifest.json
- `/dist` - Build output directory

## Permissions

This extension requires the following permissions:
- `history` - To track browsing history
- `storage` - To store user preferences and tracking data
- `tabs` - To monitor active tabs
- `activeTab` - To access the current tab
- `windows` - To track window focus state

## Privacy

All data is stored locally on your device. No data is sent to external servers.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
