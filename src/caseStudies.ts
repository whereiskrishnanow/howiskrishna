// Detail pages for the cards, keyed by project id. Each page is a list of
// blocks rendered top to bottom. Images live under /public/work/<id>/.

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  /**
   * Bullets. `lead` is shown bold; `style` sets how it joins the text:
   * 'apps' → **lead** → *text*, 'colon' → **lead:** text. No lead → plain text.
   */
  | { type: 'list'; style?: 'apps' | 'colon'; items: { lead?: string; text: string }[] }
  | { type: 'images'; src: string[]; alt: string; caption?: { title?: string; text: string } }
  /** Phone screens in a grid, each with a label. */
  | { type: 'phones'; items: { label: string; src: string }[] }
  | { type: 'closing'; text: string }

export type CaseStudy = {
  /** Shown on the right of the header. Falls back to the card's description. */
  tagline?: string
  blocks: Block[]
}

// relative, so the site works at a domain root or under a sub-path (GitHub Pages)
const img = (id: string, file: string) => `work/${id}/${file}`

export const caseStudies: Record<string, CaseStudy> = {
  superagi: {
    tagline: 'A Complete AI Super App for Work',
    blocks: [
      {
        type: 'p',
        text: 'As Founding Product Designer at SuperAGI, I led the 0→1 design of an AI-native work superapp—shaping product direction, UX, and core systems. I designed scalable experiences across categories like CRM, sales, marketing, coding, HR, and helped in turning complex agentic concepts into intuitive interfaces.',
      },
      {
        type: 'p',
        text: 'I also established the design system and interaction patterns, collaborating closely with product and engineering to ship features at impeccable pace. My focus was on simplifying experience, enabling hassle free human–AI interaction, and creating high performance user engagement across the platform.',
      },
      { type: 'h2', text: 'Understanding the ecosystem' },
      {
        type: 'p',
        text: 'SuperAGI is built as a flexible platform for businesses where users start with a simple and straight entry point i.e chat interface and then expand it by adding apps based on their specific business needs. Instead of forcing a fixed workflow likewise other niche specific SaaS products do.',
      },
      {
        type: 'p',
        text: 'SuperAGI lets users choose from different apps like CRM, Workflows, Conversations, and Multiple Agentic tools, and install only what’s relevant to them. Each app works as part of a connected ecosystem, so data, context, and insights flow seamlessly across the platform.',
      },
      {
        type: 'p',
        text: 'This makes it easy to create a personalized setup that evolves over time, allowing teams to scale their workflows without switching between multiple disconnected tools.',
      },
      { type: 'h2', text: 'Unrolling the canvas further' },
      {
        type: 'p',
        text: 'It is an AI-native system rather than a set of separate tools. It brings together plethora of apps across categories like Sales, Marketing, Support, Coding, Analytics, HR & more into one platform, where everything shares the same data and context.',
      },
      {
        type: 'p',
        text: 'Each app works on top of a unified layer, so actions in one place automatically trigger and inform others. AI agents are deeply embedded across the system, not just assisting but actually executing tasks like:',
      },
      {
        type: 'list',
        style: 'apps',
        items: [
          { lead: 'Hyper personalized outreaches', text: 'Sequences, Cold Outreach, Workflows, Marketing Campaign' },
          { lead: 'Resolving conversations', text: 'Unibox, Conversations, Support Inbox' },
          { lead: 'Writing code and monitoring checks', text: 'Coderbase, AI QA, Code Reviewer, Error Logging' },
          { lead: 'Connect with your prospects over phonecall', text: 'Voice Agents, Sales Dialer, AI Business Receptionist' },
          { lead: 'Manage your tasks & business content', text: 'Tasks, Chat, Notes, Sales Enablement' },
        ],
      },
      {
        type: 'p',
        text: 'Because of this, the platform behaves like a continuous loop: data flows in, AI learns from interactions, and workflows keep improving over time. Instead of managing multiple disconnected tools, users operate within a single evolving system that automates processes, reduces manual effort, and scales with their business.',
      },
      { type: 'h2', text: 'A slight peek into our Super App experience' },
      {
        type: 'images',
        src: [img('superagi', '01-assistant-home.webp'), img('superagi', '02-assistant-answer.webp')],
        alt: 'SuperAGI’s I Assistant: the chat home with suggested questions, and an answer listing key use cases',
        caption: {
          title: 'I Assistant',
          text: 'an in-house chat assistant that answers queries, gives complex insights, automates tasks, boosts productivity and helps you navigate and manage your dashboard. It proactively surfaces actionable recommendations and streamlines decision-making across your workflows.',
        },
      },
      {
        type: 'images',
        src: [img('superagi', '03-crm-contacts.webp'), img('superagi', '04-crm-profile.webp')],
        alt: 'The CRM app: a contacts table, and a contact’s profile page with activity, actions and agents',
        caption: {
          title: 'Data Display Ft. CRM App',
          text: 'details are put out in a structured, table-based list view for quick scanning followed by detailed profile pages with complete data and necessary actionable touchpoints.',
        },
      },
      {
        type: 'images',
        src: [img('superagi', '05-unibox.webp')],
        alt: 'The Unibox app: one inbox of conversations from every channel, with contact details alongside',
        caption: {
          title: 'Unibox App',
          text: 'centralizes all multichannel communications into one unified inbox for seamless engagement and faster responses.',
        },
      },
      {
        type: 'images',
        src: [img('superagi', '06-cold-outreach.webp')],
        alt: 'The Cold Outreach app: a multi-step outreach sequence with AI-personalised email and LinkedIn steps',
        caption: {
          title: 'Cold Outreach',
          text: 'lets you build and automate personalized, multi-step outreach workflows, helping you nurture leads, maintain consistent engagement, and scale communication effortlessly.',
        },
      },
      {
        type: 'images',
        src: [img('superagi', '07-coder-pro.webp')],
        alt: 'Coder Pro inside the team chat app: a thread with the coding agent next to a code diff',
        caption: {
          title: 'Coder Pro Agent Ft. Team Chat App',
          text: 'advanced AI-powered coding inside team chat app—writing, debugging, and refining code seamlessly in real time.',
        },
      },
      {
        type: 'images',
        src: [img('superagi', '08-live-assist.webp')],
        alt: 'I Live Assist during a video call: live insights, suggested next steps and AI responses beside the call',
        caption: {
          title: 'I Live Assist',
          text: 'competition to tools such as Cluely or Parakeet. Providing real-time AI guidance, suggestions, and contextual assistance during live interactions over video conference or physical too.',
        },
      },
      {
        type: 'closing',
        text: '…turning your entire business workflow into a connected, self-improving system where AI doesn’t just assist—but continuously drives outcomes on its own.',
      },
      { type: 'h2', text: 'Let’s connect to deep dive, Thank you' },
    ],
  },

  contlo: {
    tagline: 'B2B Marketing Automation for SMEs',
    blocks: [
      {
        type: 'p',
        text: 'At Contlo, I joined as a Founding Product Designer and led the end-to-end design of an AI-powered marketing platform for e-D2C brands. I defined core experiences, built the design system, and worked closely with founders and cross-functional teams to simplify complex workflows like multi-channel campaigns, segmentation, and automation, 3rd party integrations experience and so on.',
      },
      {
        type: 'p',
        text: 'I also drove the integration of AI into the product, reducing friction in content creation and campaign execution. My work helped shape a cohesive, scalable product that improved usability and enabled teams to deliver more personalized customer experiences.',
      },
      {
        type: 'p',
        text: 'Joined early at ~$7K ARR (yes, you heard it right) and contributed to scaling Contlo to $2.4M ARR in 20 months by leading core product design and improving key user journeys overall.',
      },
      { type: 'h2', text: 'A visual glimpse of my work' },
      {
        type: 'images',
        src: [img('contlo', '01.webp')],
        alt: 'Contlo Campaigns: a list of marketing campaigns across channels',
        caption: { title: 'Campaigns', text: 'creating and sending personalized marketing messages across channels to boost engagement and conversions.' },
      },
      {
        type: 'images',
        src: [img('contlo', '02.webp')],
        alt: 'Contlo email campaign setup: audience, content and a preview of the email',
        caption: { title: 'Email campaign setup', text: 'creating and managing email campaign, where you set audience, content, and preview the final email design before sending.' },
      },
      {
        type: 'images',
        src: [img('contlo', '03.webp')],
        alt: 'Contlo Forms: building a no-code signup popup',
        caption: { title: 'Forms', text: 'feature that lets businesses create no-code popups and forms to capture leads, collect customer data, and grow their audience.' },
      },
      {
        type: 'images',
        src: [img('contlo', '04.webp')],
        alt: 'Contlo Automations: a customer journey triggered by user actions',
        caption: { title: 'Automations', text: 'lets businesses set up automated customer journeys triggered by user actions to drive engagement, retention, and conversions.' },
      },
      {
        type: 'images',
        src: [img('contlo', '05.webp')],
        alt: 'Contlo Conversations: a two-way customer chat across channels',
        caption: { title: 'Conversations', text: 'module that enables real-time, two-way customer communication across channels, helping businesses engage, support, and convert users through personalized interactions.' },
      },
      {
        type: 'images',
        src: [img('contlo', '06.webp')],
        alt: 'Contlo AI Library: generating marketing assets from a prompt',
        caption: { title: 'AI Library', text: 'an AI powered section where users can generate their marketing essentials from simple media to complex automations just with a prompt' },
      },
      {
        type: 'closing',
        text: 'Had worked on many more modules features like Segmentation, Loyality & Referrals, Advanced Analytics (RFM, Cohorts), Website Chat Assistant and many more..',
      },
      { type: 'h2', text: 'Let’s connect to deep dive, Thank you' },
    ],
  },

  'voice-agents': {
    tagline: 'Business first AI Voice agent management platform',
    blocks: [
      { type: 'images', src: [img('voice-agents', '01.webp')], alt: 'The Voice Agents dashboard' },
      {
        type: 'p',
        text: 'Designed a PLG-focused, business-first AI voice agent platform that enables users to seamlessly create, configure, deploy, and manage voice agents seamlessly. Focused on simplifying complex voice workflows through an intuitive, self-serve experience that accelerates user onboarding, drives product adoption, and empowers businesses to scale customer conversations with AI.',
      },
      { type: 'h2', text: 'This is how we achieved a PLG first experience' },
      {
        type: 'p',
        text: 'Users can define their agent’s identity, voice, personality, knowledge base, actions, and call instructions, with built-in testing to validate the experience before deployment. Key PLG-focused design decisions:',
      },
      {
        type: 'list',
        style: 'colon',
        items: [
          { lead: 'Self-serve onboarding', text: 'Guided, step-by-step setup that reduces friction and helps users get started quickly.' },
          { lead: 'Faster time to value', text: 'Built-in test calls let users experience and refine their agents before going live.' },
          { lead: 'Progressive configuration', text: 'Breaks complex agent settings into manageable steps, keeping the experience approachable for non-technical users.' },
          { lead: 'Independent activation', text: 'Empowers users to build, test, and launch agents without relying on sales or engineering support.' },
        ],
      },
      { type: 'h2', text: 'Tech behind the scenes' },
      {
        type: 'p',
        text: 'Powered by Deepgram for real-time speech-to-text (STT) and ElevenLabs for natural-sounding text-to-speech (TTS), enabling seamless, human-like voice conversations.',
      },
      {
        type: 'p',
        text: 'For the post call summarization and AI insights, we are using our self-hosted models like Qwen 4b for high accuracy unstructured data analysis.',
      },
      { type: 'h2', text: 'Let’s look at the flow now' },
      {
        type: 'images',
        src: [img('voice-agents', '02.webp')],
        alt: 'Setting up a voice agent’s voice, behaviour and goals',
        caption: { text: 'User starts by defined the base of the voice agent by defining its core capabilities like voice, how to act & what to achieve while on calls.' },
      },
      {
        type: 'images',
        src: [img('voice-agents', '03.webp'), img('voice-agents', '04.webp')],
        alt: 'Adding text, links and files to the voice agent’s knowledge base',
        caption: { text: 'User can add structured or unstructured data into their voice agent’s knowledge base. Unstructured data can be dumped as text and structured data can be provided as URLs or files.' },
      },
      {
        type: 'images',
        src: [img('voice-agents', '05.webp'), img('voice-agents', '06.webp')],
        alt: 'Configuring in-call actions and data the voice agent collects',
        caption: { text: 'While on call, the voice agent has the capability to task actions like booking a meeting, transfer call, qualify the caller as per user criterian. The voice agent can also extract/collect data from the call and store it in the SuperAGI crm which can be used further for personalization.' },
      },
      {
        type: 'images',
        src: [img('voice-agents', '07.webp')],
        alt: 'Advanced voice agent settings',
        caption: { text: 'A few advanced options are being provided to the user so they have full control over their voice agent in terms on all aspects possible.' },
      },
      {
        type: 'images',
        src: [img('voice-agents', '08.webp')],
        alt: 'Placing a test call to the voice agent',
        caption: { text: 'User can place a test call to themselves to check how their agent is performing and ment their agent further to achieve exactly what they are looking for' },
      },
      {
        type: 'closing',
        text: 'The whole experience is being simplified when compared to the current market voice agent platforms, keeping in mind that every user’s usecase is being fullfilled simultaneously.',
      },
      { type: 'h2', text: 'Let’s connect to deep dive, Thank you' },
    ],
  },

  'coder-pro': {
    tagline: 'AI-Native Coding Assistant for Enterprise Teams',
    blocks: [
      { type: 'images', src: [img('coder-pro', '01.webp')], alt: 'Coder Pro inside the team chat app' },
      {
        type: 'p',
        text: 'An AI-powered coding assistant designed for enterprise teams to collaborate with AI agents directly within their development workflows. It enables developers to delegate coding tasks, review generated code changes, and manage iterations through a unified chat and code review interface.',
      },
      { type: 'h2', text: 'Why this kind of an experience' },
      {
        type: 'p',
        text: 'Developers already spend much of their time collaborating, discussing problems, and sharing context through chats. Instead of introducing another standalone coding tool, the idea was to bring AI-powered development directly into these conversations, making AI feel like a natural teammate within the existing workflow.',
      },
      { type: 'p', text: 'Key design considerations:' },
      {
        type: 'list',
        style: 'colon',
        items: [
          { lead: 'Contextual collaboration', text: 'AI agents can work within ongoing discussions, keeping tasks and context connected.' },
          { lead: 'Reduced context switching', text: 'Developers can delegate coding tasks, review changes, and iterate without leaving the chat.' },
          { lead: 'Human control', text: 'Inline code diffs and approval actions allow developers to review, refine, and commit changes with confidence.' },
          { lead: 'Seamless teamwork', text: 'Bringing AI into conversations makes collaboration between developers and AI agents more natural, transparent, and efficient.' },
        ],
      },
      { type: 'h2', text: 'So… this is how it goes' },
      {
        type: 'images',
        src: [img('coder-pro', '02.webp')],
        alt: 'Giving the Coder Pro agent a task in a chat',
        caption: { text: 'The Coder Pro agent is always available in user chats, 24/7; where the user just have to give it a task for the agent to get started! It is a very simple experience similar to giving a task to your co-workers.' },
      },
      {
        type: 'images',
        src: [img('coder-pro', '03.webp'), img('coder-pro', '04.webp')],
        alt: 'Choosing a local or cloud environment for the agent',
        caption: { text: 'The agent works on both local & cloud environments. User can decide what to use on their convenience and choose the following options accordingly' },
      },
      {
        type: 'images',
        src: [img('coder-pro', '05.webp'), img('coder-pro', '06.webp')],
        alt: 'The agent sending a code file in the chat, opened in detail',
        caption: { text: 'The agent now gets the task done and sends the code file in the chat itself, as a message. User will be able to view the code file in detail and make further changes if required.' },
      },
      {
        type: 'images',
        src: [img('coder-pro', '07.webp'), img('coder-pro', '08.webp')],
        alt: 'Asking for further changes, with the terminal and repository files open',
        caption: { text: 'User can further chat with the coder pro agent to get further changes done, if required. User can also user Terminal within and can also view their current folder/repo files too.' },
      },
      {
        type: 'images',
        src: [img('coder-pro', '09.webp')],
        alt: 'Committing the changes to a branch',
        caption: { text: 'Finally when the user is convinced over the output, they can commit the changes to their desired branch and just BOOM; it’s done and dusted!' },
      },
      {
        type: 'closing',
        text: 'A simple chat-first coding experience where you just co-work with an AI Agent like you work with your colleague on a day-to-day basis.',
      },
      { type: 'h2', text: 'Thank you' },
    ],
  },

  'i-live-assist': {
    tagline: 'Anonymous Personal AI Assistant & Notetaker',
    blocks: [
      { type: 'images', src: [img('i-live-assist', '01.webp')], alt: 'I Live Assist over a video call' },
      {
        type: 'p',
        text: 'Led end-to-end experience for a fully anonymous, AI-powered assistant and meeting notetaker built to help professionals navigate their day-to-day work calls more effectively. The product captures key discussion points, generates structured insights, identifies action items, and provides real-time AI assistance to help users communicate confidently, stay organized, and make better decisions—all while prioritizing user privacy and anonymity.',
      },
      { type: 'h2', text: 'Discovering the problem space' },
      {
        type: 'p',
        text: 'Professionals often struggle to actively participate in meetings while capturing key information and tracking follow-ups, leading to missed details and reduced focus.',
      },
      {
        type: 'p',
        text: 'The opportunity was to build a privacy-first AI assistant that works seamlessly in the background, helping users stay present, communicate confidently, and turn conversations into actionable outcomes.',
      },
      { type: 'h2', text: 'How is it different from Cluely AI or Parakeet AI' },
      {
        type: 'p',
        text: 'Our I Live Assist goes beyond current market meeting notetakers by being deeply integrated into the SuperAGI ecosystem. Instead of functioning as a standalone tool, it connects conversations, context, and workflows across products, creating a unified experience for users.',
      },
      {
        type: 'list',
        style: 'colon',
        items: [
          { lead: 'Connected ecosystem', text: 'Shares data seamlessly across SuperAGI products, keeping information and context in sync.' },
          { lead: 'Action-oriented AI', text: 'Turns meeting discussions into actionable tasks and workflows without switching between multiple tools.' },
          { lead: 'Unified experience', text: 'Brings meeting insights, AI assistance, and execution into one connected workspace.' },
          { lead: 'Privacy-first approach', text: 'Enables users to benefit from AI assistance while maintaining anonymity.' },
        ],
      },
      { type: 'h2', text: 'Finally, here’s how it works' },
      {
        type: 'images',
        src: [img('i-live-assist', '02.webp')],
        alt: 'The I Live Assist overlay on screen',
        caption: { text: 'I Live Assist appears as a discreet overlay on the user’s screen, truly undetectable. Users can access it anytime to listen to conversations, ask AI for real-time assistance, or hide the interface for a distraction-free experience—all without interrupting their workflow.' },
      },
      {
        type: 'images',
        src: [img('i-live-assist', '03.webp'), img('i-live-assist', '04.webp')],
        alt: 'Asking I Live Assist about the conversation during a call',
        caption: { text: 'The ‘Ask’ feature enables users to get instant, context-aware AI assistance during live meetings. Users can ask questions about the ongoing conversation or what’s on their screen and receive relevant answers, guidance, and actionable suggestions without interrupting their workflow or switching between applications.' },
      },
      {
        type: 'images',
        src: [img('i-live-assist', '05.webp'), img('i-live-assist', '01.webp')],
        alt: 'The Listen feature: live transcript, key takeaways and next steps',
        caption: { text: 'The Listen feature transforms live meeting conversations into meaningful, AI-powered insights. It automatically transcribes discussions, identifies key takeaways, and recommends actionable next steps in real time, allowing users to stay engaged in conversations while AI handles the cognitive load of note-taking and information processing.' },
      },
      {
        type: 'images',
        src: [img('i-live-assist', '06.webp')],
        alt: 'I Live Assist settings: workspace, overlay opacity and templates',
        caption: { text: 'Users are provided a greater control over their Live Assist experience, allowing them to switch workspaces, adjust overlay opacity, customize templates. These personalization options help users tailor the assistant to their workflow while keeping it accessible and unobtrusive during meetings.' },
      },
      {
        type: 'closing',
        text: 'Remember, all of this data is being pushed into the user’s SuperAGI account which helps personalize their data & core workflows on a time-to-time basis.',
      },
      { type: 'h2', text: 'Thank you' },
    ],
  },

  cookit: {
    tagline: 'Meal Kit Delivery App',
    blocks: [
      {
        type: 'p',
        text: 'A personal project I created to explore how home cooking can be simplified through a seamless digital experience for Indians. It focuses on combining recipe discovery, ingredient sourcing, and doorstep delivery into one unified flow, allowing users to choose meals and receive pre-portioned ingredients without the hassle of grocery shopping.',
      },
      {
        type: 'p',
        text: 'The concept emphasizes convenience, personalization, and guided cooking, aiming to transform the entire journey—from planning to cooking—into an efficient and enjoyable experience.',
      },
      { type: 'h2', text: 'Target audience' },
      {
        type: 'list',
        items: [
          { text: 'Busy professionals who crave home-cooked meals but lack the time for grocery shopping.' },
          { text: 'Cooking enthusiasts with limited budgets seeking affordable and delicious meal options.' },
          { text: 'Health-conscious individuals aiming to prepare nutritious meals without the hassle of ingredient sourcing.' },
          { text: 'Families looking to enjoy quality time together through cooking, despite their hectic schedules.' },
        ],
      },
      { type: 'h2', text: 'Key features' },
      {
        type: 'list',
        items: [
          { text: 'Search for recipes by cuisine, ingredients, or dietary restrictions.' },
          { text: 'View detailed recipes with ingredients, instructions, and nutrition.' },
          { text: 'Add ingredients to a cart and order from local grocers.' },
          { text: 'Customize orders with extra items or ingredient swaps.' },
          { text: 'Save favorite recipes and create personalized meal plans.' },
        ],
      },
      { type: 'h2', text: 'Final visuals' },
      {
        type: 'phones',
        items: [
          { label: 'Home page', src: img('cookit', '01.webp') },
          { label: 'Search results', src: img('cookit', '02.webp') },
          { label: 'Product detail page', src: img('cookit', '03.webp') },
          { label: 'About recipe', src: img('cookit', '04.webp') },
          { label: 'Recipe ingredients', src: img('cookit', '05.webp') },
          { label: 'How to prepare', src: img('cookit', '06.webp') },
          { label: 'Recipe FAQs', src: img('cookit', '07.webp') },
          { label: 'Search extra ingredients', src: img('cookit', '08.webp') },
          { label: 'Extra ingredients added', src: img('cookit', '09.webp') },
          { label: 'My bag', src: img('cookit', '10.webp') },
          { label: 'Order details', src: img('cookit', '11.webp') },
          { label: 'Menu', src: img('cookit', '12.webp') },
        ],
      },
      {
        type: 'closing',
        text: 'Will continue expanding the experience with recipe videos, AI powered recommendations, smarter personalization, and an enhanced end-to-end cooking experience',
      },
      { type: 'h2', text: 'Thank you' },
    ],
  },
}

const warmed = new Set<string>()

/**
 * Load and decode a case study's screenshots ahead of time (on hover), so
 * opening the page doesn't stall the transition decoding big images.
 */
export function warmCaseStudy(id: string) {
  if (warmed.has(id)) return
  warmed.add(id)
  for (const block of caseStudies[id]?.blocks ?? []) {
    const srcs = block.type === 'images' ? block.src : block.type === 'phones' ? block.items.map((i) => i.src) : []
    for (const src of srcs) {
      const img = new Image()
      img.decoding = 'async'
      img.src = src
      img.decode().catch(() => {})
    }
  }
}
