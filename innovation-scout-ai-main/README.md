# Distinct

Build the frontend for "Distinct" - an AI-powered platform that analyzes project proposals and GitHub repositories to find similar ideas, overlapping features, and opportunities for innovation. It explains WHY projects are similar and recommends how to make a project more distinctive.

TECH & SCOPE

- React + TypeScript + Tailwind + shadcn/ui, React Router, Recharts for charts, lucide-react icons, Framer Motion for subtle animations.

- Frontend only for now. Use realistic mock data, and put all data access in a single src/services/api.ts with async functions (analyzeProject, getAnalysis, listAnalyses, compareProjects) that return mock data after a short delay, so a real backend can replace it later without touching the UI.

- Fully responsive, with light and dark mode and a toggle in the navbar.

DESIGN

- Modern, clean, developer-tool feel (think Linear / Vercel). Indigo-to-violet primary accent, neutral grays, generous whitespace, rounded-xl cards, soft shadows.

- Inter for UI text, JetBrains Mono for repo names and code-like labels.

- Every async action needs loading skeletons and friendly empty and error states.

PAGES & ROUTES

1. Landing ( / )

- Navbar: logo, Features, How it works, "Analyze a project" button, theme toggle.

- Hero: headline "Is your idea really original?", subheadline about finding overlaps and discovering white space, and a primary CTA to /analyze.

- "How it works" with 3 steps: Submit your idea, AI scans similar projects, Get an originality report.

- Feature grid: Similarity Detection, Feature Overlap Matrix, Plain-English Explanations, Innovation Suggestions, Distinctiveness Score, Analysis History.

- A small animated sample result card as a preview, and a footer.

2. Analyze ( /analyze )

- Tabs for the input type: "Proposal Text" and "GitHub Repository".

- Proposal Text tab: project title input, a large textarea for the description (character counter), tag input for tech stack, and a "Key features" list where the user can add and remove features.

- GitHub Repository tab: URL input with validation (github.com/owner/repo), and a preview card showing the repo name, description, stars, language and topics (mocked).

- Optional "Compare against" section: a multi-select of sources (GitHub, Devpost, Public project database, My previous analyses) and a similarity sensitivity slider (Strict / Balanced / Broad).

- "Analyze" button. On submit, show a full-screen progress state with animated steps: "Understanding your idea", "Searching similar projects", "Comparing features", "Generating insights". Then navigate to the results page.

3. Results ( /analysis/:id ) - the core page

- Header: project title, input type badge, date, and buttons for Export (PDF, mocked), Share and Re-analyze.

- Top summary row of 3 cards:

  a) Distinctiveness Score: a radial gauge from 0 to 100 with a label (Low / Moderate / High / Highly Unique) and a one-line verdict.

  b) Similar Projects Found: a count, with the highest similarity percentage.

  c) Overlapping Features: a count, with a "most saturated area" tag.

- Tabs below:

  - "Similar Projects": a list of cards, each with the project name, source icon (GitHub or Devpost), description, stars, tech tags, a similarity percentage bar, and a "Why it's similar" expandable section with 2 or 3 bullet explanations in plain English. Each card has a "Compare side-by-side" button. Add filters (source, min similarity) and sort (similarity, stars, recency).

  - "Feature Overlap": a matrix or heatmap table with the user's features as rows, the top 5 similar projects as columns, and cells showing Full / Partial / None as colored dots with tooltips. Below it, a bar chart of "Feature saturation": how common each of the user's features is across the market.

  - "Idea Landscape": a scatter plot (Recharts) in which each project is a dot positioned by theme similarity, the user's project is highlighted, and clusters are labeled. A hover tooltip shows the project name and similarity.

  - "Innovation Opportunities": cards for unexplored angles or white space, each with a title, short description, an Impact badge (High / Medium / Low), an Effort badge, and a "Why this is open" explanation.

  - "Recommendations": a prioritized checklist of concrete suggestions to make the project distinctive (for example "Pivot the target audience to X", "Add feature Y that no similar project offers", "Replace common tech Z with W"). Each has a checkbox, a category tag (Features, Audience, Tech, Positioning) and an expandable rationale. Show a progress bar for how many have been adopted, and a "Projected distinctiveness score" that goes up as the user ticks them.

4. Compare ( /compare?a=...&b=... )

- Side-by-side layout: the user's project on the left, a selected similar project on the right.

- Rows for description, features, tech stack, target audience and approach, with matching items highlighted green and differences highlighted amber.

- A bottom panel, "What makes yours different", with an AI-style summary.

5. History ( /history )

- A table or card grid of past analyses with the title, type, distinctiveness score, date and status. Add search, a sort dropdown, delete with a confirmation dialog, and click-through to the results page.

6. Dashboard ( /dashboard )

- Stats cards: total analyses, average distinctiveness, projects scanned, recommendations adopted.

- A line chart of distinctiveness score over time, a "Recent analyses" list and a "Start new analysis" CTA.

SHARED COMPONENTS

- Navbar with route links and a mobile hamburger menu, a reusable ScoreGauge, SimilarityBar, ProjectCard, FeatureMatrix, EmptyState, LoadingSteps, and toast notifications for actions.

MOCK DATA

- Create 3 complete sample analyses (for example an "AI Study Planner", a "Campus Event Finder" and a "Blood Bank Management System") with 6 to 8 similar projects each, realistic features, explanations and recommendations, so every page looks complete when the app loads.

POLISH

- Smooth page transitions, hover effects on cards, keyboard-accessible controls, proper aria labels, and consistent spacing. Do not add authentication yet.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6c95a146-eddb-40dc-a27e-fa81a1ff1ef3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
