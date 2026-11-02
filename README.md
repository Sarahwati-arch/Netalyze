# Netalyze

A social media comment analyzer. It classifies each comment by sentiment and each account by authenticity, then shows the results in charts.

## Features
- **Sentiment analysis:** labels comments as positive, negative, or neutral
- **Account analysis:** labels accounts as genuine, buzzer, or suspicious
- **Charts:** sentiment distribution and account type distribution
- [Optional: import comments from CSV or a social media link]

## Tech stack
- TypeScript, [framework, for example Next.js or React]
- [Sentiment model or API, for example an LLM API or a Python model]
- [Chart library, for example Recharts or Chart.js]

## How it works
1. Comments are collected from [source].
2. Each comment is classified for sentiment by [method].
3. Each account is scored using [signals, for example posting frequency, repeated text, or profile data] and labeled genuine, buzzer, or suspicious.
4. Results are shown as charts and tables.

## Getting started
```bash
git clone https://github.com/Sarahwati-arch/Netalyze.git
cd Netalyze
npm install
npm run dev
```

## Screenshots
[Add the sentiment chart, the account chart, and the main dashboard]

## Notes
Account labels are estimates based on behavior patterns, not proof of identity.
