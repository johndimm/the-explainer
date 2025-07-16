This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/pages/api-reference/create-next-app).

## Getting Started

### Environment Setup

To use the text explanation features, you'll need to set up API keys for your preferred LLM providers:

1. Create a `.env.local` file in the root directory
2. Add API keys for the providers you want to support:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   ANTHROPIC_API_KEY=your_anthropic_api_key_here
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
3. Get API keys from:
   - [OpenAI Platform](https://platform.openai.com/api-keys)
   - [Anthropic Console](https://console.anthropic.com/)
   - [DeepSeek Platform](https://platform.deepseek.com/)
   - [Google AI Studio](https://aistudio.google.com/app/apikey)

4. Set up your database connection:
   ```
   DATABASE_URL=your_postgresql_connection_string
   ```

**Note**: Users can also provide their own API keys through the settings interface for BYOLLM functionality.

### Development

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Features

### Core Functionality
- **Text Selection**: Click (desktop) or double-tap (mobile) to select lines of text from classic literature
- **AI Explanations**: Get detailed explanations of difficult or archaic language with context
- **Confirmation Dialog**: Preview selected text and credit costs before submitting explanations
- **Multiple Text Sources**: Support for various classic texts including Shakespeare's works

### Credit System
- **Anonymous Users**: 3 free explanations to try the service
- **Signed-in Users**: 1 free explanation per hour + purchased credits
- **BYOLLM Users**: 5x efficiency (0.2 credits per explanation) when using your own API key
- **Smart Prioritization**: Free hourly credits are automatically used before purchased credits

### User Experience
- **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- **Draggable Panels**: Resize text and chat panels with touch-friendly controls
- **Font Customization**: Choose font family and size for comfortable reading
- **Bookmarking**: Automatically saves and restores your reading position
- **Profile Management**: Customize language, age, and nationality for personalized explanations

### Technical Features
- **Multiple LLM Providers**: Support for OpenAI, Anthropic, DeepSeek, Gemini, and custom endpoints
- **Session Management**: Secure authentication with NextAuth.js
- **Database Integration**: PostgreSQL for user data and credit tracking
- **Real-time Updates**: Dynamic credit status and explanation availability

## How It Works

### Text Selection & Explanation Flow
1. **Select Text**: Click a line (desktop) or double-tap (mobile) to select text for explanation
2. **Confirmation Dialog**: A dialog appears showing:
   - The selected text preview
   - Your available explanations count
   - Credit cost information (free hourly credit vs. purchased credits)
3. **Get Explanation**: Click "Get Explanation" to receive an AI-powered explanation
4. **Follow-up Questions**: Ask additional questions about the text in the chat panel

### Credit Usage Priority
- **Free Hourly Credits**: Always used first when available
- **Purchased Credits**: Used only when no free credits are available
- **BYOLLM Credits**: More efficient (0.2 credits per explanation) with your own API key

## Language Learning Tips

### Custom Profile Settings for Language Learning
The app's profile customization features make it perfect for language learning:

- **Language**: Set your target language (e.g., French, Spanish, German)
- **Age**: Set a younger age for simpler explanations
- **Nationality**: Set the target country for cultural context

**Pro Tip**: If you're learning French, try setting your profile to:
- Language: French
- Age: 8 years old  
- Nationality: France

This will give you explanations in simple French that are easy to understand at your level, while also providing cultural context from a French perspective. The same technique works for any language you're learning!

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.

