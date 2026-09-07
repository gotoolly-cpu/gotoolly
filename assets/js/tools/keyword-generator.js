// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    maxKeywords: 500,
    copyTimeout: 2000,
    notificationDuration: 3500,
    defaultCategories: ['exact', 'long-tail', 'questions', 'modifiers'],
    export: {
        encoding: 'UTF-8',
        includeMetadata: true,
        delimiter: ','
    },
    ui: {
        scrollBehavior: 'smooth',
        block: 'nearest'
    },
    quality: {
        minKeywordLength: 3,
        maxKeywordLength: 60,
        maxWords: 8
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================
const Utils = {
    normalizeKeyword(str) {
        return str.trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s-]/g, '')
            .toLowerCase()
            .trim();
    },

    slugify(str) {
        return str.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    },

    capitalize(str) {
        return str.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    },

    removeDuplicates(arr) {
        return [...new Set(arr)];
    },

    escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: `${mimeType};charset=${CONFIG.export.encoding}` });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    },

    async copyText(text) {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    },

    formatNumber(num) {
        return num.toLocaleString();
    },

    formatTime(ms) {
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    },

    sortKeywords(keywords, order = 'default') {
        const sorted = [...keywords];
        if (order === 'length') {
            sorted.sort((a, b) => a.length - b.length);
        } else if (order === 'alphabetical') {
            sorted.sort((a, b) => a.localeCompare(b));
        }
        return sorted;
    },

    // Detect keyword type
    detectKeywordType(topic) {
        const topicLower = topic.toLowerCase().trim();
        const firstWord = topicLower.split(/\s+/)[0];

        // Action/verb phrases — detect BEFORE keyword matches to prevent misclassification
        const actionVerbs = ['generate','compress','convert','remove','resize','optimize','shrink',
            'extract','merge','split','crop','rotate','flip','invert','blur','sharpen','enhance',
            'reduce','increase','edit','create','make','build','develop','design','write','read',
            'parse','format','clean','trim','cut','paste','copy','delete','add','insert','update',
            'change','transform','translate','encode','decode','encrypt','decrypt','hash','sign',
            'verify','search','find','replace','sort','filter','group','count','calculate','compute',
            'evaluate','analyze','test','check','validate','compare','detect','identify','classify',
            'predict','recommend','minimize','maximize','adjust','correct','fix','repair','restore',
            'recover','backup','archive','unzip','unpack','render','export','import','download',
            'upload','install','setup','configure','connect','disconnect','organize','summarize',
            'paraphrase','rewrite','automate','schedule','plan','track','manage','grade','score'];
        if (actionVerbs.indexOf(firstWord) !== -1) return 'action';

        // File formats
        const formats = ['pdf','jpg','jpeg','png','gif','svg','webp','bmp','tiff','eps','raw',
            'mp3','mp4','wav','flac','aac','ogg','wma','mov','avi','mkv','csv','json','xml',
            'yaml','yml','toml','ini','log','txt','rtf','md','html','css','js','ts','jsx','tsx',
            'py','rb','go','rs','zip','tar','gz','rar','7z','iso','dmg','ttf','otf','woff'];
        for (let f of formats) { if (topicLower.indexOf(f) !== -1) return 'file-format'; }

        const toolKeywords = ['tool', 'software', 'app', 'application', 'platform', 'editor', 'compressor', 'converter'];
        const serviceKeywords = ['service', 'consulting', 'agency', 'solution'];
        const productKeywords = ['product', 'course', 'template', 'theme', 'plugin'];
        const programmingKeywords = ['python', 'javascript', 'react', 'vue', 'angular', 'node', 'php', 'java', 'c++', 'golang', 'rust'];
        const designKeywords = ['design', 'ui', 'ux', 'figma', 'sketch', 'photoshop', 'illustrator'];
        const seoKeywords = ['seo', 'keyword', 'backlink', 'rank', 'search', 'google', 'bing'];
        const aiKeywords = ['ai', 'artificial', 'machine', 'deep', 'neural', 'gpt', 'chatgpt', 'llm'];
        const imageKeywords = ['image', 'photo', 'picture', 'graphic', 'png', 'jpeg', 'jpg', 'gif'];
        const videoKeywords = ['video', 'youtube', 'vimeo', 'mp4', 'avi'];
        const audioKeywords = ['audio', 'music', 'mp3', 'sound', 'podcast'];
        const blogKeywords = ['blog', 'blogger', 'blogging', 'wordpress', 'medium', 'ghost'];
        const ecommerceKeywords = ['ecommerce', 'shop', 'store', 'woocommerce', 'shopify'];
        const socialKeywords = ['social', 'instagram', 'tiktok', 'twitter', 'facebook', 'linkedin'];

        if (topicLower.includes('ai') || topicLower.includes('artificial')) return 'ai';
        if (seoKeywords.some(kw => topicLower.includes(kw))) return 'seo';
        if (programmingKeywords.some(kw => topicLower.includes(kw))) return 'programming';
        if (designKeywords.some(kw => topicLower.includes(kw))) return 'design';
        if (imageKeywords.some(kw => topicLower.includes(kw))) return 'image';
        if (videoKeywords.some(kw => topicLower.includes(kw))) return 'video';
        if (audioKeywords.some(kw => topicLower.includes(kw))) return 'audio';
        if (blogKeywords.some(kw => topicLower.includes(kw))) return 'blog';
        if (ecommerceKeywords.some(kw => topicLower.includes(kw))) return 'ecommerce';
        if (socialKeywords.some(kw => topicLower.includes(kw))) return 'social';
        if (toolKeywords.some(kw => topicLower.includes(kw))) return 'tool';
        if (serviceKeywords.some(kw => topicLower.includes(kw))) return 'service';
        if (productKeywords.some(kw => topicLower.includes(kw))) return 'product';
        return 'general';
    }
};

// ============================================
// TEMPLATE ENGINE
// ============================================
class TemplateEngine {
    constructor() {
        this.templates = this.initializeTemplates();
        this.categories = this.initializeCategories();
        this.topicTypeMap = new Map();
    }

    initializeTemplates() {
        return {
            // Commercial Intent
            commercial: {
                templates: [
                    'best {keyword}',
                    'top {keyword}',
                    '{keyword} deals',
                    'cheap {keyword}',
                    'affordable {keyword}',
                    '{keyword} discount',
                    '{keyword} coupon',
                    'premium {keyword}',
                    'professional {keyword}',
                    '{keyword} offers',
                    'discount {keyword}',
                    'promo {keyword}'
                ],
                intent: 'commercial',
                weight: 10
            },

            // Transactional Intent
            transactional: {
                templates: [
                    'buy {keyword}',
                    'purchase {keyword}',
                    'order {keyword}',
                    '{keyword} price',
                    '{keyword} cost',
                    '{keyword} pricing',
                    '{keyword} subscription',
                    '{keyword} plans',
                    '{keyword} packages',
                    '{keyword} fees',
                    '{keyword} checkout',
                    '{keyword} shopping',
                    'where to buy {keyword}',
                    'how much does {keyword} cost'
                ],
                intent: 'transactional',
                weight: 10
            },

            // Informational Intent
            informational: {
                templates: [
                    'what is {keyword}',
                    'how does {keyword} work',
                    '{keyword} explained',
                    'understand {keyword}',
                    '{keyword} basics',
                    '{keyword} fundamentals',
                    'learn {keyword}',
                    '{keyword} tutorial',
                    '{keyword} guide',
                    '{keyword} overview',
                    'introduction to {keyword}',
                    'getting started with {keyword}'
                ],
                intent: 'informational',
                weight: 9
            },

            // Questions
            questions: {
                templates: [
                    'how to use {keyword}',
                    'how do I {keyword}',
                    'when to use {keyword}',
                    'why use {keyword}',
                    'which {keyword} is best',
                    'is {keyword} worth it',
                    'does {keyword} work',
                    'can I use {keyword}',
                    'what are the benefits of {keyword}',
                    'how to choose {keyword}'
                ],
                intent: 'informational',
                weight: 8
            },

            // Comparison
            comparison: {
                templates: [
                    '{keyword} vs alternatives',
                    '{keyword} comparison',
                    'compare {keyword} tools',
                    '{keyword} vs competitors',
                    'best {keyword} alternatives',
                    '{keyword} similar products',
                    'top {keyword} alternatives',
                    'alternative to {keyword}',
                    '{keyword} replacement'
                ],
                intent: 'comparison',
                weight: 7
            },

            // Reviews
            reviews: {
                templates: [
                    '{keyword} review',
                    '{keyword} reviews',
                    '{keyword} ratings',
                    '{keyword} pros and cons',
                    '{keyword} feedback',
                    'user reviews of {keyword}',
                    'customer reviews {keyword}',
                    '{keyword} testimonial',
                    '{keyword} user experience'
                ],
                intent: 'commercial',
                weight: 8
            },

            // Tutorials & Learning
            tutorials: {
                templates: [
                    '{keyword} tutorial',
                    '{keyword} step by step',
                    '{keyword} walkthrough',
                    '{keyword} for beginners',
                    'advanced {keyword} tutorial',
                    '{keyword} training',
                    'complete {keyword} course',
                    'learn {keyword} online',
                    '{keyword} certification',
                    '{keyword} course',
                    '{keyword} workshop'
                ],
                intent: 'informational',
                weight: 9
            },

            // Research
            research: {
                templates: [
                    '{keyword} research',
                    '{keyword} study',
                    '{keyword} analysis',
                    '{keyword} data',
                    '{keyword} statistics',
                    '{keyword} metrics',
                    '{keyword} insights',
                    '{keyword} trends',
                    '{keyword} report'
                ],
                intent: 'informational',
                weight: 6
            },

            // SEO & Marketing
            seo: {
                templates: [
                    '{keyword} SEO',
                    '{keyword} for SEO',
                    '{keyword} keyword research',
                    '{keyword} content strategy',
                    '{keyword} marketing',
                    '{keyword} digital marketing',
                    '{keyword} seo strategy',
                    '{keyword} ranking',
                    '{keyword} search volume',
                    '{keyword} keyword difficulty',
                    '{keyword} organic traffic',
                    '{keyword} backlinks'
                ],
                intent: 'informational',
                weight: 8
            },

            // AI & Technology
            ai: {
                templates: [
                    'AI {keyword}',
                    '{keyword} automation',
                    '{keyword} AI tool',
                    '{keyword} machine learning',
                    '{keyword} artificial intelligence',
                    '{keyword} ChatGPT',
                    'AI-powered {keyword}',
                    'smart {keyword}',
                    'intelligent {keyword}'
                ],
                intent: 'informational',
                weight: 7
            },

            // Developer Tools
            developer: {
                templates: [
                    '{keyword} API',
                    '{keyword} SDK',
                    '{keyword} documentation',
                    '{keyword} code',
                    '{keyword} development',
                    '{keyword} programming',
                    '{keyword} integration',
                    '{keyword} npm',
                    '{keyword} github',
                    '{keyword} open source',
                    '{keyword} developer guide'
                ],
                intent: 'informational',
                weight: 6
            },

            // Content Creation
            content: {
                templates: [
                    '{keyword} content',
                    '{keyword} blogging',
                    '{keyword} writing',
                    '{keyword} copywriting',
                    '{keyword} content marketing',
                    '{keyword} blog post',
                    '{keyword} article',
                    '{keyword} content ideas',
                    'content creation for {keyword}'
                ],
                intent: 'informational',
                weight: 7
            },

            // Business
            business: {
                templates: [
                    '{keyword} for business',
                    'business {keyword}',
                    '{keyword} enterprise',
                    '{keyword} for teams',
                    'corporate {keyword}',
                    'small business {keyword}',
                    'business solution {keyword}',
                    '{keyword} ROI'
                ],
                intent: 'commercial',
                weight: 7
            },

            // E-commerce
            ecommerce: {
                templates: [
                    '{keyword} for ecommerce',
                    'ecommerce {keyword}',
                    '{keyword} store',
                    '{keyword} shopify',
                    '{keyword} woocommerce',
                    '{keyword} online store',
                    '{keyword} marketplace',
                    '{keyword} products'
                ],
                intent: 'commercial',
                weight: 7
            },

            // YouTube & Video
            youtube: {
                templates: [
                    '{keyword} YouTube',
                    'YouTube {keyword}',
                    '{keyword} video',
                    'video about {keyword}',
                    '{keyword} content creator',
                    'YouTube tutorial {keyword}',
                    '{keyword} for YouTubers',
                    '{keyword} video tutorial'
                ],
                intent: 'informational',
                weight: 6
            },

            // Social Media
            social: {
                templates: [
                    '{keyword} social media',
                    '{keyword} Instagram',
                    '{keyword} TikTok',
                    '{keyword} Twitter',
                    '{keyword} LinkedIn',
                    '{keyword} Facebook',
                    '{keyword} social media strategy',
                    '{keyword} viral content'
                ],
                intent: 'informational',
                weight: 5
            },

            // Beginner
            beginner: {
                templates: [
                    '{keyword} for beginners',
                    'beginner {keyword}',
                    '{keyword} 101',
                    'getting started with {keyword}',
                    '{keyword} basics',
                    '{keyword} introduction',
                    'new to {keyword}',
                    'simple {keyword}',
                    'easy {keyword} tutorial'
                ],
                intent: 'informational',
                weight: 9
            },

            // Advanced
            advanced: {
                templates: [
                    'advanced {keyword}',
                    'expert {keyword}',
                    '{keyword} advanced techniques',
                    '{keyword} optimization',
                    'professional {keyword}',
                    'master {keyword}',
                    'deep dive {keyword}',
                    '{keyword} advanced guide'
                ],
                intent: 'informational',
                weight: 6
            }
        };
    }

    initializeCategories() {
        return Object.keys(this.templates);
    }

    getTemplatesByCategory(category) {
        return this.templates[category] || null;
    }

    getCategories() {
        return this.categories;
    }

    getIntentForCategory(category) {
        const template = this.templates[category];
        return template ? template.intent : 'unknown';
    }

    getWeightForCategory(category) {
        const template = this.templates[category];
        return template ? template.weight : 5;
    }

    // Get relevant templates based on topic type
    getRelevantTemplates(topicType) {
        const relevanceMap = {
            'action': ['informational', 'questions', 'tutorials', 'beginner', 'research', 'seo', 'content'],
            'tool': ['commercial', 'transactional', 'informational', 'questions', 'comparison', 'reviews', 'tutorials', 'beginner', 'research'],
            'service': ['commercial', 'transactional', 'questions', 'comparison', 'reviews', 'business', 'research'],
            'product': ['commercial', 'transactional', 'questions', 'comparison', 'reviews', 'business', 'ecommerce'],
            'file-format': ['informational', 'questions', 'tutorials', 'beginner', 'comparison', 'content'],
            'programming': ['developer', 'informational', 'questions', 'tutorials', 'advanced', 'seo', 'research'],
            'design': ['content', 'informational', 'questions', 'tutorials', 'beginner', 'advanced'],
            'seo': ['seo', 'informational', 'questions', 'tutorials', 'comparison', 'advanced', 'research'],
            'ai': ['ai', 'developer', 'informational', 'questions', 'tutorials', 'research', 'advanced'],
            'image': ['informational', 'questions', 'tutorials', 'beginner', 'comparison'],
            'video': ['youtube', 'social', 'informational', 'questions', 'tutorials', 'beginner'],
            'audio': ['informational', 'questions', 'tutorials', 'beginner'],
            'blog': ['content', 'seo', 'social', 'informational', 'questions', 'tutorials'],
            'ecommerce': ['ecommerce', 'business', 'informational', 'questions', 'comparison'],
            'social': ['social', 'youtube', 'content', 'informational', 'questions'],
            'general': ['informational', 'questions', 'tutorials', 'comparison', 'beginner', 'content', 'research']
        };

        return relevanceMap[topicType] || relevanceMap['general'];
    }

    generateFromTemplate(template, keyword) {
        // Replace plural placeholders
        let result = template.replace(/\{keyword\}/g, keyword);
        
        // Generate plural version for certain contexts
        if (template.includes('{keyword}') && !template.includes('{keyword}')) {
            // Add plural for specific templates
            const pluralKeywords = ['tool', 'software', 'app', 'platform', 'service', 'product', 'solution'];
            if (pluralKeywords.some(kw => keyword.includes(kw))) {
                // Keep as is for these cases
            }
        }
        
        return result;
    }

    generatePlural(keyword) {
        // Simple pluralization for common cases
        if (keyword.endsWith('y')) {
            return keyword.slice(0, -1) + 'ies';
        }
        if (keyword.endsWith('s') || keyword.endsWith('x') || keyword.endsWith('z')) {
            return keyword + 'es';
        }
        if (keyword.endsWith('ch') || keyword.endsWith('sh')) {
            return keyword + 'es';
        }
        return keyword + 's';
    }
}

// ============================================
// DOMAIN KNOWLEDGE
// ============================================

const DOMAIN_CONCEPTS = {
    seo: [
        'keyword research', 'keyword ideas', 'keyword discovery', 'keyword analysis',
        'keyword planner', 'keyword tool', 'keyword finder', 'keyword generator',
        'search terms', 'search queries', 'seed keywords', 'focus keywords',
        'long-tail keywords', 'short-tail keywords', 'semantic keywords', 'LSI keywords',
        'keyword difficulty', 'search volume', 'keyword density', 'keyword ranking',
        'keyword strategy', 'keyword mapping', 'keyword grouping', 'keyword clustering',
        'SEO strategy', 'content strategy', 'on-page SEO', 'off-page SEO',
        'technical SEO', 'local SEO', 'voice search', 'featured snippets',
        'SERP features', 'organic ranking', 'organic traffic', 'backlinks',
        'link building', 'domain authority', 'page authority', 'site audit',
        'content optimization', 'blog SEO', 'blog keywords', 'pillar content',
        'topic clusters', 'Google SEO', 'YouTube SEO', 'Bing SEO',
        'SEO tools', 'rank tracker', 'Search Console', 'Google Trends',
        'competitor analysis', 'SEO audit', 'site speed', 'mobile SEO',
        'content marketing', 'editorial calendar', 'content planning'
    ],
    image: [
        'image converter', 'image compressor', 'image editor', 'photo editor',
        'image resizer', 'image cropper', 'image optimizer', 'batch processor',
        'background remover', 'image upscaler', 'photo enhancer', 'watermark tool',
        'resize image', 'compress image', 'crop image', 'convert image',
        'remove background', 'upscale image', 'enhance photo', 'batch process',
        'optimize for web', 'reduce file size', 'image editing', 'photo editing',
        'online image editor', 'desktop photo editor', 'Photoshop alternative',
        'free photo editor', 'image formats', 'image quality', 'image size',
        'vector graphics', 'raster images', 'image compression', 'image processing'
    ],
    video: [
        'video editor', 'video converter', 'video compressor', 'video merger',
        'video trimmer', 'screen recorder', 'video downloader', 'video enhancer',
        'subtitle editor', 'video editing', 'video production', 'video marketing',
        'video content', 'live streaming', 'video podcast', 'video tutorial',
        'YouTube video', 'TikTok video', 'Instagram Reels', 'video format',
        'video quality', 'video compression', 'video optimization',
        'online video editor', 'free video editor', 'professional video editing',
        'video creation', 'video rendering', 'video effects', 'video transitions'
    ],
    programming: [
        'coding', 'software development', 'web development', 'mobile development',
        'data science', 'machine learning', 'algorithms', 'data structures',
        'design patterns', 'clean code', 'code editor', 'IDE', 'debugging',
        'testing', 'version control', 'Git', 'GitHub', 'Docker', 'Kubernetes',
        'CI/CD', 'package manager', 'programming tutorial', 'coding for beginners',
        'learn programming', 'programming basics', 'code review', 'software engineering',
        'frontend development', 'backend development', 'full stack', 'API development',
        'database design', 'cloud computing', 'DevOps', 'agile methodology'
    ],
    ecommerce: [
        'online store', 'online shop', 'dropshipping', 'product listing',
        'product photography', 'inventory management', 'order fulfillment',
        'payment processing', 'shipping', 'Shopify', 'WooCommerce', 'Magento',
        'ecommerce platform', 'ecommerce website', 'product page', 'shopping cart',
        'checkout optimization', 'conversion rate', 'abandoned cart', 'product description',
        'Google Shopping', 'Facebook Marketplace', 'Amazon seller', 'eBay selling',
        'ecommerce marketing', 'product launch', 'sales funnel', 'customer retention'
    ],
    content: [
        'content writing', 'copywriting', 'blog writing', 'article writing',
        'creative writing', 'technical writing', 'SEO writing', 'content creation',
        'content strategy', 'writing tools', 'grammar checker', 'plagiarism checker',
        'readability checker', 'word counter', 'text editor', 'Markdown editor',
        'blog editor', 'content planning', 'content calendar', 'editorial process',
        'writing tips', 'writing skills', 'writing guide', 'writing process',
        'blog post', 'article structure', 'headline writing', 'content format'
    ],
    social: [
        'social media marketing', 'social media management', 'social media content',
        'social media strategy', 'social media analytics', 'social media growth',
        'influencer marketing', 'community management', 'brand building',
        'social media scheduler', 'hashtag generator', 'caption generator',
        'Instagram marketing', 'TikTok marketing', 'YouTube marketing',
        'Facebook marketing', 'Twitter marketing', 'LinkedIn marketing',
        'social media templates', 'content calendar', 'social media ROI',
        'engagement rate', 'follower growth', 'social media trends'
    ],
    business: [
        'startup', 'small business', 'entrepreneurship', 'business plan',
        'marketing strategy', 'digital marketing', 'email marketing',
        'brand building', 'customer acquisition', 'growth hacking',
        'CRM', 'project management', 'time tracking', 'invoicing',
        'accounting software', 'HR software', 'business tools', 'productivity',
        'business growth', 'market research', 'competitive analysis', 'SWOT analysis',
        'business model', 'revenue model', 'pricing strategy', 'customer retention'
    ],
    design: [
        'graphic design', 'UI design', 'UX design', 'web design',
        'brand design', 'print design', 'motion graphics', '3D design',
        'design tools', 'Figma', 'Sketch', 'Adobe XD', 'Canva',
        'Photoshop', 'Illustrator', 'design principles', 'color theory',
        'typography', 'layout design', 'responsive design', 'design system',
        'wireframe', 'prototype', 'user interface', 'user experience',
        'visual design', 'logo design', 'icon design', 'brand identity'
    ],
    ai: [
        'artificial intelligence', 'machine learning', 'deep learning',
        'natural language processing', 'computer vision', 'generative AI',
        'ChatGPT', 'AI tools', 'AI writing', 'AI image generation',
        'AI code generation', 'AI automation', 'AI for business',
        'AI assistant', 'AI chatbot', 'AI analytics', 'AI translator',
        'AI summarizer', 'AI classifier', 'AI prediction', 'AI optimization',
        'prompt engineering', 'AI ethics', 'AI applications', 'AI trends',
        'AI in healthcare', 'AI in finance', 'AI in education', 'AI in marketing'
    ]
};

const CONCEPT_PROFILES = {
    'keyword research': {
        allowedVerbs: ['find', 'discover', 'do', 'use', 'learn', 'start', 'master'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for SEO', 'for ecommerce', 'for YouTube', 'for blogs', 'for startups', 'for agencies', 'in 2025', 'step by step', 'from scratch', 'without tools', 'advanced'],
        templates: ['{verb} {concept}', 'best {concept} tools', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', '{concept} strategies', 'what is {concept}', '{concept} examples', '{concept} checklist', '{concept} workflow'],
        intentPriorities: ['informational', 'commercial']
    },
    'image compressor': {
        allowedVerbs: ['compress', 'reduce', 'optimize', 'shrink', 'batch', 'use', 'find', 'learn'],
        forbiddenVerbs: ['write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for web', 'for WordPress', 'for ecommerce', 'for photographers', 'for developers', 'for social media', 'for email', 'for logos', 'without losing quality', 'lossless', 'in bulk', 'for free', 'online', 'in 2025', 'step by step'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without losing quality', 'top {concept} tools', '{concept} best practices', '{concept} for {modifier}'],
        intentPriorities: ['commercial', 'informational']
    },
    'background remover': {
        allowedVerbs: ['remove', 'erase', 'change', 'make', 'replace', 'use', 'find', 'learn', 'add'],
        forbiddenVerbs: ['compress', 'convert', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for product photos', 'for portraits', 'for ecommerce', 'for social media', 'for logos', 'for designers', 'without Photoshop', 'with AI', 'automatically', 'in bulk', 'for free', 'online', 'in 2025', 'step by step', 'for beginners'],
        templates: ['best {concept} tool', 'how to {verb} background', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without Photoshop', 'top {concept} tools', '{concept} best practices'],
        intentPriorities: ['commercial', 'informational']
    },
    'image resizer': {
        allowedVerbs: ['resize', 'scale', 'change', 'adjust', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['for social media', 'for web', 'for WordPress', 'for ecommerce', 'for photographers', 'in bulk', 'without losing quality', 'for free', 'online', 'in 2025', 'step by step', 'for beginners'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without losing quality', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'image converter': {
        allowedVerbs: ['convert', 'change', 'transform', 'use', 'find', 'learn', 'batch'],
        forbiddenVerbs: ['compress', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['for web', 'for photographers', 'for developers', 'in bulk', 'without quality loss', 'for free', 'online', 'in 2025', 'step by step', 'for beginners'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'image upscaler': {
        allowedVerbs: ['upscale', 'enlarge', 'increase', 'enhance', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['with AI', 'without losing quality', 'for print', 'for web', 'for photographers', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'super resolution'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without losing quality', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'watermark tool': {
        allowedVerbs: ['add', 'remove', 'create', 'batch', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'resize', 'upscale', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for photographers', 'for brands', 'for ecommerce', 'for social media', 'for logos', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'in bulk'],
        templates: ['best {concept}', 'how to {verb} watermark', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'photo editor': {
        allowedVerbs: ['edit', 'enhance', 'retouch', 'adjust', 'crop', 'filter', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for beginners', 'for photographers', 'for social media', 'for free', 'online', 'without Photoshop', 'in 2025', 'step by step', 'professional', 'advanced', 'mobile'],
        templates: ['best {concept}', 'how to {verb} photos', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without Photoshop', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'image cropper': {
        allowedVerbs: ['crop', 'trim', 'cut', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['for social media', 'for web', 'in bulk', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'to aspect ratio'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'image optimizer': {
        allowedVerbs: ['optimize', 'compress', 'improve', 'speed up', 'use', 'find', 'learn'],
        forbiddenVerbs: ['convert', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['for web', 'for WordPress', 'for speed', 'for SEO', 'for ecommerce', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'in bulk'],
        templates: ['best {concept} tool', 'how to {verb} images', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'image format converter': {
        allowedVerbs: ['convert', 'change', 'transform', 'batch', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'write', 'develop', 'code', 'rank', 'research', 'plan', 'remove'],
        modifiers: ['for web', 'for photographers', 'in bulk', 'for free', 'online', 'in 2025', 'step by step', 'for beginners'],
        templates: ['best {concept} tool', 'how to {verb} formats', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'markdown editor': {
        allowedVerbs: ['use', 'find', 'learn', 'write', 'create', 'build'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'optimize', 'upscale', 'edit'],
        modifiers: ['for developers', 'for writers', 'for beginners', 'for free', 'open source', 'online', 'in 2025', 'distraction-free', 'with preview', 'with WYSIWYG', 'for documentation', 'for note-taking'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['informational', 'commercial']
    },
    'code editor': {
        allowedVerbs: ['use', 'find', 'learn', 'customize', 'configure'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'optimize', 'upscale', 'edit'],
        modifiers: ['for developers', 'for Python', 'for JavaScript', 'for beginners', 'for free', 'open source', 'in 2025', 'with extensions', 'lightweight', 'fast', 'for large projects'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['informational', 'commercial']
    },
    'text editor': {
        allowedVerbs: ['use', 'find', 'learn', 'write'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'optimize', 'upscale'],
        modifiers: ['for writers', 'for beginners', 'for free', 'open source', 'minimal', 'distraction-free', 'in 2025', 'lightweight', 'fast'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives'],
        intentPriorities: ['informational', 'commercial']
    },
    'video editor': {
        allowedVerbs: ['edit', 'trim', 'cut', 'merge', 'add', 'remove', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'resize', 'crop', 'optimize', 'upscale', 'write', 'develop', 'code'],
        modifiers: ['for beginners', 'for YouTube', 'for TikTok', 'for free', 'professional', 'online', 'in 2025', 'step by step', 'with effects', 'for social media', 'mobile', 'desktop'],
        templates: ['best {concept}', 'how to {verb} video', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'SEO strategy': {
        allowedVerbs: ['develop', 'create', 'learn', 'improve', 'optimize', 'build', 'plan', 'start'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for ecommerce', 'for blogs', 'for local business', 'in 2025', 'step by step', 'from scratch', 'advanced', 'for startups'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} examples', '{concept} checklist', '{concept} in {year}', 'best {concept} practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'content strategy': {
        allowedVerbs: ['develop', 'create', 'build', 'plan', 'learn', 'improve'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for startups', 'for ecommerce', 'for blogs', 'for B2B', 'for SaaS', 'in 2025', 'step by step', 'from scratch', 'advanced'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} examples', '{concept} checklist'],
        intentPriorities: ['informational', 'commercial']
    },
    'link building': {
        allowedVerbs: ['build', 'get', 'find', 'earn', 'learn', 'create', 'develop'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for SEO', 'for small business', 'for ecommerce', 'in 2025', 'step by step', 'from scratch', 'advanced', 'white hat'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}', 'best {concept} practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'content optimization': {
        allowedVerbs: ['optimize', 'improve', 'enhance', 'learn', 'create'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for SEO', 'for beginners', 'for blogs', 'for WordPress', 'for ecommerce', 'in 2025', 'step by step', 'advanced'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} best practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'on-page SEO': {
        allowedVerbs: ['optimize', 'improve', 'fix', 'learn', 'audit', 'check'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for WordPress', 'for blogs', 'for ecommerce', 'in 2025', 'step by step', 'checklist', 'advanced'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} checklist', 'what is {concept}', '{concept} in {year}'],
        intentPriorities: ['informational', 'commercial']
    },
    'local SEO': {
        allowedVerbs: ['optimize', 'improve', 'learn', 'rank', 'dominate', 'boost'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for restaurants', 'for dentists', 'for lawyers', 'in 2025', 'step by step', 'from scratch'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}'],
        intentPriorities: ['informational', 'commercial']
    },
    'site audit': {
        allowedVerbs: ['run', 'perform', 'do', 'learn', 'check', 'analyze'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for SEO', 'for WordPress', 'for free', 'in 2025', 'step by step', 'technical', 'comprehensive'],
        templates: ['how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', 'free {concept}', '{concept} tools', 'what is {concept}', '{concept} checklist'],
        intentPriorities: ['informational', 'commercial']
    },
    'content marketing': {
        allowedVerbs: ['start', 'build', 'create', 'learn', 'develop', 'plan', 'grow'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for startups', 'for B2B', 'for small business', 'for ecommerce', 'in 2025', 'step by step', 'from scratch', 'on a budget'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}'],
        intentPriorities: ['informational', 'commercial']
    },
    'backlinks': {
        allowedVerbs: ['get', 'build', 'earn', 'find', 'create', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for SEO', 'for free', 'for small business', 'in 2025', 'step by step', 'from scratch', 'fast', 'white hat'],
        templates: ['how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what are {concept}', '{concept} strategies', 'best {concept} methods', '{concept} in {year}'],
        intentPriorities: ['informational', 'commercial']
    },
    'organic ranking': {
        allowedVerbs: ['improve', 'boost', 'increase', 'learn', 'achieve', 'rank'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for SEO', 'for small business', 'for blogs', 'in 2025', 'step by step', 'fast', 'without paid ads'],
        templates: ['how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}'],
        intentPriorities: ['informational', 'commercial']
    },
    'social media marketing': {
        allowedVerbs: ['learn', 'start', 'build', 'grow', 'create', 'plan', 'use'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for startups', 'for ecommerce', 'for free', 'in 2025', 'step by step', 'from scratch', 'on a budget', 'organic'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}', 'best {concept} practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'email marketing': {
        allowedVerbs: ['start', 'learn', 'create', 'build', 'send', 'automate', 'grow'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for ecommerce', 'for free', 'in 2025', 'step by step', 'from scratch', 'on a budget', 'B2B', 'B2C'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}', 'best {concept} practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'digital marketing': {
        allowedVerbs: ['learn', 'start', 'build', 'grow', 'create', 'plan', 'master'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for startups', 'for ecommerce', 'for free', 'in 2025', 'step by step', 'from scratch', 'on a budget'],
        templates: ['{verb} {concept}', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} guide', '{concept} tutorial', '{concept} tips', 'what is {concept}', '{concept} strategies', '{concept} in {year}', 'best {concept} practices'],
        intentPriorities: ['informational', 'commercial']
    },
    'grammar checker': {
        allowedVerbs: ['use', 'find', 'learn', 'check', 'fix', 'improve'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for writers', 'for students', 'for free', 'online', 'in 2025', 'step by step', 'for academic writing', 'for business'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'plagiarism checker': {
        allowedVerbs: ['use', 'find', 'learn', 'check', 'detect', 'scan'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for students', 'for teachers', 'for writers', 'for free', 'online', 'in 2025', 'step by step', 'for academic writing', 'accurate'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'readability checker': {
        allowedVerbs: ['use', 'find', 'learn', 'check', 'improve', 'analyze'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for writers', 'for beginners', 'for content creators', 'for free', 'online', 'in 2025', 'step by step', 'for blogs'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'word counter': {
        allowedVerbs: ['use', 'find', 'learn', 'count', 'check', 'track'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for writers', 'for students', 'for free', 'online', 'in 2025', 'step by step', 'for essays', 'for SEO'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'hashtag generator': {
        allowedVerbs: ['use', 'find', 'learn', 'generate', 'create', 'get'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for Instagram', 'for TikTok', 'for Twitter', 'for YouTube', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'viral'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'QR code': {
        allowedVerbs: ['create', 'generate', 'make', 'scan', 'use', 'find', 'learn', 'decode'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'edit'],
        modifiers: ['for free', 'for business', 'for restaurants', 'for events', 'for WiFi', 'for marketing', 'online', 'in 2025', 'step by step', 'for beginners', 'custom', 'with logo'],
        templates: ['best {concept} generator', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'password': {
        allowedVerbs: ['create', 'generate', 'make', 'find', 'learn', 'store', 'manage', 'check'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'edit', 'download'],
        modifiers: ['for free', 'for beginners', 'strong', 'secure', 'random', 'in 2025', 'step by step', 'for business', 'for personal use', 'generator', 'manager'],
        templates: ['best {concept} generator', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools', '{concept} best practices'],
        intentPriorities: ['commercial', 'informational']
    },
    'video editor': {
        allowedVerbs: ['edit', 'trim', 'cut', 'merge', 'add', 'remove', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'resize', 'crop', 'optimize', 'upscale', 'write', 'develop', 'code'],
        modifiers: ['for beginners', 'for YouTube', 'for TikTok', 'for free', 'professional', 'online', 'in 2025', 'step by step', 'with effects', 'for social media', 'mobile', 'desktop'],
        templates: ['best {concept}', 'how to {verb} video', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'video compressor': {
        allowedVerbs: ['compress', 'reduce', 'shrink', 'optimize', 'use', 'find', 'learn'],
        forbiddenVerbs: ['edit', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for web', 'for email', 'for social media', 'without losing quality', 'in bulk', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'batch'],
        templates: ['best {concept} tool', 'how to {verb} video', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', '{concept} without losing quality', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'video converter': {
        allowedVerbs: ['convert', 'change', 'transform', 'batch', 'use', 'find', 'learn'],
        forbiddenVerbs: ['edit', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for web', 'for social media', 'for free', 'online', 'in bulk', 'in 2025', 'step by step', 'for beginners', 'without quality loss'],
        templates: ['best {concept} tool', 'how to {verb} video', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'screen recorder': {
        allowedVerbs: ['record', 'capture', 'use', 'find', 'learn', 'stream'],
        forbiddenVerbs: ['compress', 'convert', 'edit', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for beginners', 'for tutorials', 'for gaming', 'for free', 'online', 'in 2025', 'step by step', 'with audio', 'with webcam', 'HD', 'no watermark'],
        templates: ['best {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'video merger': {
        allowedVerbs: ['merge', 'combine', 'join', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'edit', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for free', 'online', 'in bulk', 'in 2025', 'step by step', 'for beginners', 'without watermark', 'without quality loss'],
        templates: ['best {concept} tool', 'how to {verb} videos', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'video trimmer': {
        allowedVerbs: ['trim', 'cut', 'crop', 'split', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'edit', 'write', 'develop', 'code', 'rank', 'research', 'plan'],
        modifiers: ['for free', 'online', 'in 2025', 'step by step', 'for beginners', 'without watermark', 'without quality loss', 'for social media'],
        templates: ['best {concept} tool', 'how to {verb} video', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'subtitle editor': {
        allowedVerbs: ['add', 'edit', 'create', 'generate', 'sync', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for YouTube', 'for TikTok', 'for free', 'online', 'in 2025', 'step by step', 'for beginners', 'auto-generated', 'SRT', 'VTT'],
        templates: ['best {concept}', 'how to {verb} subtitles', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    },
    'budget': {
        allowedVerbs: ['create', 'make', 'plan', 'track', 'manage', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for small business', 'for personal', 'for free', 'online', 'in 2025', 'step by step', 'template', 'spreadsheet'],
        templates: ['best {concept} template', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools', '{concept} examples'],
        intentPriorities: ['informational', 'commercial']
    },
    'invoice': {
        allowedVerbs: ['create', 'make', 'send', 'track', 'manage', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for freelancers', 'for small business', 'for free', 'online', 'in 2025', 'step by step', 'template', 'with taxes', 'professional'],
        templates: ['best {concept} template', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools', '{concept} examples'],
        intentPriorities: ['informational', 'commercial']
    },
    'percentage': {
        allowedVerbs: ['calculate', 'find', 'compute', 'learn', 'use'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for free', 'online', 'in 2025', 'step by step', 'for beginners', 'calculator', 'formula', 'quick'],
        templates: ['best {concept} calculator', 'how to calculate {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept} calculator', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', '{concept} formula'],
        intentPriorities: ['informational', 'commercial']
    },
    'unit conversion': {
        allowedVerbs: ['convert', 'change', 'calculate', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'remove', 'resize', 'crop', 'download', 'edit'],
        modifiers: ['for free', 'online', 'in 2025', 'step by step', 'for beginners', 'quick', 'all units', 'metric', 'imperial'],
        templates: ['best {concept} tool', 'how to convert {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept} converter', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', '{concept} calculator'],
        intentPriorities: ['informational', 'commercial']
    },
    'cipher': {
        allowedVerbs: ['encrypt', 'decrypt', 'encode', 'decode', 'use', 'find', 'learn', 'create'],
        forbiddenVerbs: ['compress', 'remove', 'resize', 'crop', 'download', 'edit'],
        modifiers: ['for free', 'online', 'in 2025', 'step by step', 'for beginners', 'Caesar', 'ROT13', 'AES', 'strong', 'secure', 'generator'],
        templates: ['best {concept} tool', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['informational', 'commercial']
    },
    'json': {
        allowedVerbs: ['format', 'validate', 'convert', 'minify', 'beautify', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'remove', 'resize', 'crop', 'download', 'edit'],
        modifiers: ['for free', 'online', 'in 2025', 'step by step', 'for beginners', 'formatter', 'validator', 'converter', 'viewer', 'editor', 'pretty print'],
        templates: ['best {concept} tool', 'how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept} formatter', '{concept} online', '{concept} alternatives', 'what is {concept}', '{concept} for beginners', 'top {concept} tools'],
        intentPriorities: ['informational', 'commercial']
    },
    'video editing': {
        allowedVerbs: ['learn', 'start', 'master', 'improve', 'practice', 'use', 'find'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for YouTube', 'for TikTok', 'for free', 'professional', 'in 2025', 'step by step', 'from scratch', 'at home', 'on a budget', 'mobile', 'desktop'],
        templates: ['how to {verb} {concept}', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', '{concept} tips', 'what is {concept}', '{concept} for beginners', '{concept} software', 'best {concept} software', '{concept} techniques', 'learn {concept} from scratch'],
        intentPriorities: ['informational', 'commercial']
    },
    'audio editing': {
        allowedVerbs: ['edit', 'mix', 'master', 'record', 'use', 'find', 'learn'],
        forbiddenVerbs: ['compress', 'convert', 'remove', 'resize', 'crop', 'download'],
        modifiers: ['for beginners', 'for podcasts', 'for music', 'for free', 'professional', 'online', 'in 2025', 'step by step', 'from scratch', 'at home'],
        templates: ['best {concept} software', 'how to {verb} audio', '{concept} for {modifier}', '{concept} tutorial', '{concept} guide', 'free {concept}', '{concept} online', '{concept} alternatives', '{concept} comparison', 'what is {concept}', '{concept} for beginners', '{concept} vs alternatives', 'top {concept} tools'],
        intentPriorities: ['commercial', 'informational']
    }
};

const CURATED_QUERIES = {
    'keyword research': [
        'how to do keyword research for SEO',
        'best keyword research tools for beginners',
        'keyword research tutorial step by step',
        'free keyword research tools 2025',
        'how to find long tail keywords',
        'keyword research for YouTube videos',
        'keyword research for ecommerce products',
        'best SEO keyword research strategy'
    ],
    'image compressor': [
        'best image compressor for web',
        'how to compress images without losing quality',
        'free online image compressor for WordPress',
        'compress JPEG images for email',
        'batch image compression tool',
        'image compressor for ecommerce product photos',
        'how to reduce image file size for website',
        'best free image compressor 2025'
    ],
    'background remover': [
        'best free background remover online',
        'how to remove background from product photos',
        'AI background remover without Photoshop',
        'remove background from portrait photos',
        'batch background removal for ecommerce',
        'background remover for social media posts',
        'how to make background transparent in photo',
        'best background remover tool 2025'
    ],
    'image resizer': [
        'how to resize images for social media',
        'best free image resizer online',
        'resize images without losing quality',
        'batch image resize for web',
        'image resizer for WordPress',
        'how to change image dimensions for Instagram',
        'resize product photos for ecommerce',
        'best image resizer tool 2025'
    ],
    'image converter': [
        'how to convert JPEG to PNG online',
        'best free image format converter',
        'convert HEIC to JPEG without quality loss',
        'batch image converter for web',
        'how to convert PNG to WebP',
        'image converter for photographers',
        'best image file converter tool 2025',
        'convert RAW photos to JPEG free'
    ],
    'image upscaler': [
        'best AI image upscaler free online',
        'how to enlarge image without losing quality',
        'upscale photos for print free',
        'AI image upscaling step by step',
        'how to increase image resolution',
        'best image upscaler tool 2025',
        'upscale low resolution photos',
        'enlarge image for ecommerce product photos'
    ],
    'watermark tool': [
        'how to add watermark to photos free',
        'best watermark tool for photographers',
        'batch watermark images for ecommerce',
        'add text watermark to photos online',
        'how to protect photos with watermark',
        'best free watermark maker 2025',
        'watermark tool for social media images',
        'remove watermark from photo online'
    ],
    'photo editor': [
        'best free online photo editor',
        'how to edit photos without Photoshop',
        'photo editor for beginners step by step',
        'best photo editing app for social media',
        'free photo editor with filters and effects',
        'how to retouch portrait photos',
        'professional photo editor online free',
        'best photo editing tool 2025'
    ],
    'image cropper': [
        'best free online image cropper',
        'how to crop images for Instagram',
        'crop photo to aspect ratio online',
        'batch image crop tool free',
        'how to crop product photos for ecommerce',
        'image cropper for social media',
        'best image cropping tool 2025',
        'smart crop images for web'
    ],
    'image optimizer': [
        'best image optimizer for website speed',
        'how to optimize images for web free',
        'image optimization for Core Web Vitals',
        'batch image optimizer for WordPress',
        'how to compress images for faster loading',
        'best image optimization tool 2025',
        'optimize images for ecommerce website',
        'lazy loading images for performance'
    ],
    'image format converter': [
        'how to convert image formats online free',
        'best image format converter tool',
        'convert PNG to WebP for web',
        'batch format conversion for photographers',
        'JPEG to PNG converter free online',
        'best image file converter 2025',
        'HEIC to JPEG converter for Mac',
        'image format conversion without quality loss'
    ],
    'markdown editor': [
        'best markdown editor for developers',
        'free open source markdown editor',
        'markdown editor with live preview',
        'how to write documentation in Markdown',
        'best markdown editor for note taking',
        'markdown editor for GitHub README',
        'distraction free markdown editor',
        'best markdown editor 2025'
    ],
    'code editor': [
        'best code editor for developers',
        'free code editor for Python',
        'best lightweight code editor for large projects',
        'code editor with IntelliSense',
        'best free IDE for JavaScript',
        'code editor for beginners',
        'best open source code editor 2025',
        'best code editor with extensions'
    ],
    'text editor': [
        'best minimal text editor for writers',
        'free distraction free text editor',
        'best lightweight text editor',
        'text editor for plain text files',
        'best open source text editor 2025',
        'simple text editor for beginners',
        'best fast text editor for developers',
        'minimalist text editor for note taking'
    ],
    'video editor': [
        'best free video editor for YouTube',
        'how to edit video for TikTok',
        'video editor for beginners step by step',
        'best professional video editor 2025',
        'free online video editor no watermark',
        'how to edit video on phone free',
        'best video editing software for social media',
        'video editor with effects and transitions'
    ],
    'video compressor': [
        'best free video compressor online',
        'how to compress video without losing quality',
        'compress video for email attachment',
        'batch video compression tool',
        'how to reduce video file size',
        'best video compressor for web 2025',
        'compress video for social media upload',
        'lossless video compression tool'
    ],
    'video converter': [
        'best free video format converter',
        'how to convert MP4 to AVI online',
        'batch video converter tool free',
        'convert video for social media',
        'best video file converter 2025',
        'convert video without quality loss',
        'how to change video format online',
        'video converter for all formats'
    ],
    'screen recorder': [
        'best free screen recorder for tutorials',
        'screen recorder with audio and webcam',
        'how to record screen for YouTube',
        'best screen recorder for gaming',
        'free screen recorder no watermark',
        'screen recorder for Windows free',
        'best screen recording tool 2025',
        'online screen recorder for meetings'
    ],
    'video merger': [
        'best free video merger online',
        'how to combine videos without watermark',
        'merge video clips for social media',
        'batch video merger tool free',
        'best video joiner tool 2025',
        'merge videos without quality loss',
        'combine MP4 files online free',
        'video merger for beginners'
    ],
    'video trimmer': [
        'best free video trimmer online',
        'how to cut video for social media',
        'trim video without quality loss',
        'video trimmer for TikTok',
        'best video cutter tool 2025',
        'trim video for Instagram Reels',
        'cut video clip online free',
        'video trimmer for beginners'
    ],
    'subtitle editor': [
        'best free subtitle editor online',
        'how to add subtitles to YouTube video',
        'subtitle editor for TikTok videos',
        'auto generate subtitles for video',
        'best SRT editor tool 2025',
        'add captions to video free online',
        'subtitle editor for beginners',
        'sync subtitles with video tool'
    ],
    'grammar checker': [
        'best free grammar checker online',
        'grammar checker for academic writing',
        'how to check grammar in essays',
        'grammar checker for business emails',
        'best grammar tool for writers 2025',
        'free grammar and spell checker',
        'grammar checker for students free',
        'best English grammar checker tool'
    ],
    'plagiarism checker': [
        'best free plagiarism checker for students',
        'how to check plagiarism in essays',
        'plagiarism checker for academic writing',
        'free plagiarism detection tool online',
        'best plagiarism checker 2025',
        'plagiarism checker for teachers free',
        'accurate plagiarism detection tool',
        'plagiarism checker for blog posts'
    ],
    'readability checker': [
        'best free readability checker online',
        'how to improve content readability',
        'readability checker for blog posts',
        'Flesch reading ease checker free',
        'readability score tool for writers',
        'best readability analysis tool 2025',
        'check readability of articles free',
        'readability checker for content creators'
    ],
    'word counter': [
        'best free word counter online',
        'word counter for essays',
        'character and word counter tool',
        'word counter for SEO content',
        'best word counting tool 2025',
        'free word and character counter',
        'word counter for blog posts',
        'online word counter for students'
    ],
    'hashtag generator': [
        'best free hashtag generator for Instagram',
        'how to find viral hashtags for TikTok',
        'hashtag generator for Twitter posts',
        'best hashtag tool for YouTube 2025',
        'free hashtag generator online',
        'how to create trending hashtags',
        'hashtag generator for social media marketing',
        'best hashtag research tool free'
    ],
    'QR code': [
        'best free QR code generator online',
        'how to create QR code for WiFi',
        'QR code generator with logo',
        'best QR code tool for business',
        'free QR code generator 2025',
        'how to make custom QR code',
        'QR code generator for restaurants',
        'QR code for event tickets free'
    ],
    'password': [
        'best free password generator online',
        'how to create strong passwords',
        'random password generator tool',
        'password manager for beginners',
        'best password generator 2025',
        'how to generate secure passwords',
        'password generator for business',
        'strong password creation tool free'
    ],
    'budget': [
        'best free budget template for beginners',
        'how to create a monthly budget',
        'budget planner for small business',
        'personal budget spreadsheet free',
        'best budgeting tool 2025',
        'how to manage money effectively',
        'budget template for freelancers',
        'free budget calculator online'
    ],
    'invoice': [
        'best free invoice template for freelancers',
        'how to create professional invoice',
        'invoice generator for small business',
        'free invoice template with taxes',
        'best invoicing tool 2025',
        'how to send invoice online free',
        'invoice template for consultants',
        'free online invoice maker'
    ],
    'percentage': [
        'best free percentage calculator online',
        'how to calculate percentage increase',
        'percentage calculator for students',
        'quick percentage calculation tool',
        'percentage formula calculator free',
        'best percentage tool 2025',
        'how to find percentage of a number',
        'percentage difference calculator free'
    ],
    'unit conversion': [
        'best free unit converter online',
        'how to convert metric to imperial',
        'unit conversion tool for students',
        'temperature converter free online',
        'best unit conversion app 2025',
        'how to convert units quickly',
        'length and weight converter free',
        'online measurement converter tool'
    ],
    'cipher': [
        'best free cipher encoder decoder',
        'how to encrypt text with Caesar cipher',
        'Caesar cipher decoder online free',
        'best encryption tool for beginners',
        'ROT13 encoder decoder free',
        'cipher tool for cryptography learning',
        'best cipher generator 2025',
        'simple text encryption tool online'
    ],
    'json': [
        'best free JSON formatter online',
        'how to format JSON code',
        'JSON validator and beautifier tool',
        'best JSON viewer for developers',
        'free JSON converter tool 2025',
        'how to minify JSON code',
        'JSON pretty print online free',
        'JSON editor for beginners'
    ],
    'video editing': [
        'how to start video editing for beginners',
        'best video editing software free',
        'video editing tutorial step by step',
        'how to edit videos at home',
        'best video editing app for social media',
        'professional video editing tips',
        'learn video editing from scratch',
        'best video editing tool 2025'
    ],
    'audio editing': [
        'best free audio editor for podcasts',
        'how to edit audio recordings',
        'audio editing software for beginners',
        'best free audio editor 2025',
        'how to mix music at home',
        'audio editing for YouTube videos',
        'best audio editor for voice recording',
        'audio mastering tool free online'
    ],
    'SEO strategy': [
        'how to develop an SEO strategy for beginners',
        'best SEO strategy for small business',
        'SEO strategy tutorial step by step',
        'how to create content strategy for SEO',
        'best SEO practices for ecommerce',
        'SEO strategy for local business 2025',
        'how to improve organic rankings',
        'complete SEO strategy guide'
    ],
    'content strategy': [
        'how to develop a content strategy',
        'best content strategy for startups',
        'content strategy tutorial for beginners',
        'content planning guide step by step',
        'best content marketing strategy 2025',
        'how to create editorial calendar',
        'content strategy for B2B businesses',
        'complete content strategy guide'
    ],
    'link building': [
        'how to build backlinks for SEO',
        'best link building strategies for beginners',
        'link building tutorial step by step',
        'how to get high quality backlinks',
        'best link building tools 2025',
        'white hat link building techniques',
        'link building for small business',
        'complete link building guide'
    ],
    'content optimization': [
        'how to optimize content for SEO',
        'best content optimization techniques',
        'content optimization tutorial for beginners',
        'how to improve article readability',
        'best SEO content optimization tools',
        'content optimization checklist 2025',
        'how to optimize blog posts for search',
        'complete content optimization guide'
    ],
    'on-page SEO': [
        'how to optimize on page SEO',
        'on page SEO checklist for beginners',
        'on page SEO tutorial step by step',
        'best on page SEO techniques 2025',
        'how to optimize title tags and meta descriptions',
        'on page SEO for WordPress',
        'on page SEO optimization guide',
        'complete on page SEO checklist'
    ],
    'local SEO': [
        'how to optimize local SEO for small business',
        'local SEO tutorial for beginners',
        'local SEO strategy for restaurants',
        'how to rank in Google Maps',
        'best local SEO tools 2025',
        'local SEO for dentists and lawyers',
        'Google Business Profile optimization guide',
        'complete local SEO checklist'
    ],
    'site audit': [
        'how to run a website SEO audit',
        'best free SEO audit tools',
        'site audit tutorial for beginners',
        'how to perform technical SEO audit',
        'best website audit tool 2025',
        'SEO site audit checklist',
        'how to check website health',
        'comprehensive website audit guide'
    ],
    'content marketing': [
        'how to start content marketing',
        'best content marketing strategy for startups',
        'content marketing tutorial for beginners',
        'how to create content marketing plan',
        'best content marketing tools 2025',
        'content marketing for small business',
        'how to grow with content marketing',
        'complete content marketing guide'
    ],
    'backlinks': [
        'how to get backlinks for free',
        'best backlink strategies for beginners',
        'how to earn high quality backlinks',
        'backlink building tutorial step by step',
        'best backlink tools 2025',
        'how to analyze competitor backlinks',
        'backlink strategies for small business',
        'complete backlink building guide'
    ],
    'organic ranking': [
        'how to improve organic ranking on Google',
        'best strategies for organic traffic',
        'organic ranking tutorial for beginners',
        'how to rank without paid ads',
        'best SEO tools for organic growth 2025',
        'how to increase organic search traffic',
        'organic ranking techniques for small business',
        'complete guide to organic SEO'
    ],
    'social media marketing': [
        'how to start social media marketing',
        'best social media strategy for beginners',
        'social media marketing tutorial step by step',
        'how to grow on social media for free',
        'best social media tools 2025',
        'social media marketing for small business',
        'how to create social media content calendar',
        'complete social media marketing guide'
    ],
    'email marketing': [
        'how to start email marketing for free',
        'best email marketing strategy for beginners',
        'email marketing tutorial step by step',
        'how to build email list from scratch',
        'best email marketing tools 2025',
        'email marketing for small business',
        'how to write marketing emails',
        'complete email marketing guide'
    ],
    'digital marketing': [
        'how to start digital marketing',
        'best digital marketing strategy for beginners',
        'digital marketing tutorial step by step',
        'how to learn digital marketing for free',
        'best digital marketing tools 2025',
        'digital marketing for small business',
        'how to create digital marketing plan',
        'complete digital marketing guide'
    ]
};

const TOOL_SEARCH_TERMS = {
    'generate keywords': [
        'keyword generator', 'keyword research tool', 'keyword finder',
        'keyword suggestion tool', 'SEO keyword generator', 'free keyword generator',
        'keyword idea generator', 'keyword research'
    ],
    'keyword generator': [
        'keyword generator', 'keyword research tool', 'keyword finder',
        'keyword suggestion tool', 'SEO keyword generator', 'free keyword generator',
        'keyword idea generator', 'keyword research'
    ],
    'password generator': [
        'password generator', 'random password generator', 'secure password generator',
        'password creator', 'strong password generator', 'online password generator',
        'free password generator', 'password maker'
    ],
    'qr code generator': [
        'QR code generator', 'QR code maker', 'QR code creator',
        'free QR code generator', 'online QR code generator', 'QR code tool',
        'QR code builder', 'custom QR code generator'
    ],
    'readability checker': [
        'readability checker', 'readability test', 'readability analyzer',
        'reading level checker', 'Flesch reading score', 'readability score checker',
        'free readability checker', 'readability tool'
    ],
    'grammar checker': [
        'grammar checker', 'grammar tool', 'English grammar checker',
        'free grammar checker', 'grammar and spell checker', 'grammar corrector',
        'grammar proofreader', 'writing grammar tool'
    ],
    'plagiarism checker': [
        'plagiarism checker', 'plagiarism detector', 'plagiarism tool',
        'free plagiarism checker', 'plagiarism scanner', 'copy checker',
        'content plagiarism checker', 'online plagiarism checker'
    ],
    'word counter': [
        'word counter', 'word count tool', 'character counter',
        'word and character counter', 'free word counter', 'word count calculator',
        'text word counter', 'online word counter'
    ],
    'image compressor': [
        'image compressor', 'photo compressor', 'image reducer',
        'compress image', 'image size reducer', 'free image compressor',
        'online image compressor', 'image optimizer'
    ],
    'background remover': [
        'background remover', 'remove background', 'background eraser',
        'photo background remover', 'free background remover', 'AI background remover',
        'online background remover', 'image background remover'
    ],
    'image resizer': [
        'image resizer', 'photo resizer', 'resize image',
        'image size changer', 'free image resizer', 'online image resizer',
        'photo size reducer', 'image dimension changer'
    ],
    'image converter': [
        'image converter', 'photo converter', 'format converter',
        'image format converter', 'free image converter', 'online image converter',
        'convert image format', 'photo format converter'
    ],
    'image upscaler': [
        'image upscaler', 'photo upscaler', 'image enlarger',
        'upscale image', 'AI image upscaler', 'free image upscaler',
        'image resolution enhancer', 'photo enlarger'
    ],
    'watermark tool': [
        'watermark tool', 'watermark maker', 'watermark adder',
        'add watermark', 'free watermark tool', 'photo watermark tool',
        'image watermark tool', 'watermark creator'
    ],
    'photo editor': [
        'photo editor', 'image editor', 'online photo editor',
        'free photo editor', 'photo editing tool', 'image editing tool',
        'photo retouching tool', 'picture editor'
    ],
    'image cropper': [
        'image cropper', 'photo cropper', 'crop image',
        'image cutter', 'free image cropper', 'online image cropper',
        'photo crop tool', 'image trimmer'
    ],
    'image optimizer': [
        'image optimizer', 'photo optimizer', 'optimize image',
        'image speed optimizer', 'free image optimizer', 'web image optimizer',
        'image performance tool', 'image compressor for web'
    ],
    'image format converter': [
        'image format converter', 'photo format converter', 'convert image format',
        'JPEG PNG converter', 'free image converter', 'online format converter',
        'image file converter', 'photo format changer'
    ],
    'video editor': [
        'video editor', 'video editing tool', 'online video editor',
        'free video editor', 'video maker', 'video creator',
        'movie editor', 'video editing software'
    ],
    'video compressor': [
        'video compressor', 'video reducer', 'compress video',
        'video size reducer', 'free video compressor', 'online video compressor',
        'video optimizer', 'video file compressor'
    ],
    'video converter': [
        'video converter', 'video format converter', 'convert video',
        'free video converter', 'online video converter', 'video file converter',
        'MP4 converter', 'video format changer'
    ],
    'screen recorder': [
        'screen recorder', 'screen capture', 'screen recording tool',
        'free screen recorder', 'online screen recorder', 'screenshot tool',
        'screen capture software', 'desktop recorder'
    ],
    'video merger': [
        'video merger', 'video joiner', 'merge videos',
        'combine videos', 'free video merger', 'online video merger',
        'video combiner', 'video stitcher'
    ],
    'video trimmer': [
        'video trimmer', 'video cutter', 'trim video',
        'video clipper', 'free video trimmer', 'online video trimmer',
        'video splitter', 'video chopping tool'
    ],
    'subtitle editor': [
        'subtitle editor', 'subtitle tool', 'add subtitles',
        'subtitle maker', 'free subtitle editor', 'online subtitle editor',
        'caption editor', 'subtitle creator'
    ],
    'markdown editor': [
        'markdown editor', 'markdown tool', 'online markdown editor',
        'free markdown editor', 'markdown preview', 'markdown writer',
        'markdown editor online', 'MD editor'
    ],
    'code editor': [
        'code editor', 'code tool', 'online code editor',
        'free code editor', 'code editor online', 'programming editor',
        'source code editor', 'code writing tool'
    ],
    'text editor': [
        'text editor', 'notepad', 'online text editor',
        'free text editor', 'plain text editor', 'simple text editor',
        'text editing tool', 'online notepad'
    ],
    'hashtag generator': [
        'hashtag generator', 'hashtag tool', 'hashtag creator',
        'hashtag maker', 'free hashtag generator', 'online hashtag generator',
        'hashtag finder', 'social media hashtag tool'
    ],
    'budget calculator': [
        'budget calculator', 'budget tool', 'budget planner',
        'budget manager', 'free budget calculator', 'online budget tool',
        'budget planner calculator', 'personal budget calculator'
    ],
    'invoice generator': [
        'invoice generator', 'invoice maker', 'invoice creator',
        'free invoice generator', 'online invoice tool', 'invoice template',
        'invoice builder', 'bill generator'
    ],
    'percentage calculator': [
        'percentage calculator', 'percent calculator', 'percentage tool',
        'free percentage calculator', 'online percentage calculator',
        'percent converter', 'percentage finder', 'percentage formula calculator'
    ],
    'unit converter': [
        'unit converter', 'measurement converter', 'unit tool',
        'free unit converter', 'online unit converter', 'unit conversion tool',
        'metric converter', 'measurement calculator'
    ],
    'cipher tool': [
        'cipher tool', 'encoder decoder', 'encryption tool',
        'cipher encoder', 'Caesar cipher tool', 'free cipher tool',
        'online cipher tool', 'text encoder decoder'
    ],
    'json formatter': [
        'JSON formatter', 'JSON validator', 'JSON beautifier',
        'JSON tool', 'free JSON formatter', 'online JSON formatter',
        'JSON editor', 'JSON parser tool'
    ],
    'seo strategy': [
        'SEO strategy', 'SEO plan', 'search engine optimization strategy',
        'SEO guide', 'SEO planning', 'SEO roadmap',
        'SEO optimization plan', 'search ranking strategy'
    ],
    'content strategy': [
        'content strategy', 'content plan', 'content marketing strategy',
        'content planning', 'editorial strategy', 'content roadmap',
        'content creation strategy', 'blog strategy'
    ],
    'link building': [
        'link building', 'backlink builder', 'link acquisition',
        'backlink strategy', 'link building strategy', 'link outreach',
        'backlink building', 'link earning'
    ],
    'content optimization': [
        'content optimization', 'SEO content optimization', 'article optimizer',
        'content SEO', 'on-page content optimization', 'content optimization tool',
        'blog post optimization', 'website content optimizer'
    ],
    'on-page SEO': [
        'on-page SEO', 'on-site SEO', 'on page optimization',
        'on-page optimization', 'website SEO', 'page SEO',
        'on page SEO audit', 'on-page SEO checklist'
    ],
    'local SEO': [
        'local SEO', 'local search optimization', 'Google Maps SEO',
        'local business SEO', 'local ranking', 'local search ranking',
        'local SEO strategy', 'Google Business Profile optimization'
    ],
    'site audit': [
        'site audit', 'SEO audit', 'website audit',
        'site health check', 'SEO site audit', 'website SEO audit',
        'site analysis', 'website performance audit'
    ],
    'content marketing': [
        'content marketing', 'content promotion', 'content strategy',
        'digital content marketing', 'content marketing strategy',
        'content creation marketing', 'blog marketing', 'content distribution'
    ],
    'backlinks': [
        'backlinks', 'inbound links', 'backlink analysis',
        'backlink checker', 'backlink building', 'backlink strategy',
        'link profile', 'link building strategy'
    ],
    'organic ranking': [
        'organic ranking', 'organic search ranking', 'Google ranking',
        'search ranking', 'organic traffic', 'organic SEO',
        'natural search ranking', 'search engine ranking'
    ],
    'social media marketing': [
        'social media marketing', 'social media strategy', 'social media promotion',
        'social media advertising', 'social media management',
        'social media growth', 'social media campaign', 'social media branding'
    ],
    'email marketing': [
        'email marketing', 'email campaign', 'email newsletter',
        'email automation', 'email marketing strategy', 'email promotion',
        'email outreach', 'email marketing tool'
    ],
    'digital marketing': [
        'digital marketing', 'online marketing', 'internet marketing',
        'digital advertising', 'digital marketing strategy',
        'digital promotion', 'online advertising', 'web marketing'
    ],
    'background removal': [
        'background remover', 'remove background', 'background eraser',
        'photo background remover', 'free background remover', 'AI background remover',
        'online background remover', 'image background remover'
    ],
    'image compression': [
        'image compressor', 'photo compressor', 'compress image',
        'image reducer', 'free image compressor', 'online image compressor',
        'image size reducer', 'photo size reducer'
    ],
    'image resizing': [
        'image resizer', 'photo resizer', 'resize image',
        'image dimension changer', 'free image resizer', 'online image resizer',
        'photo size reducer', 'image scaling'
    ],
    'image conversion': [
        'image converter', 'photo converter', 'format converter',
        'image format converter', 'free image converter', 'online image converter',
        'convert image format', 'photo format converter'
    ],
    'image upscaling': [
        'image upscaler', 'photo upscaler', 'image enlarger',
        'upscale image', 'AI image upscaler', 'free image upscaler',
        'image resolution enhancer', 'photo enlarger'
    ],
    'photo editing': [
        'photo editor', 'image editor', 'online photo editor',
        'free photo editor', 'photo editing tool', 'image editing tool',
        'photo retouching tool', 'picture editor'
    ],
    'image cropping': [
        'image cropper', 'photo cropper', 'crop image',
        'image cutter', 'free image cropper', 'online image cropper',
        'photo crop tool', 'image trimmer'
    ],
    'image optimization': [
        'image optimizer', 'photo optimizer', 'optimize image',
        'image speed optimizer', 'free image optimizer', 'web image optimizer',
        'image performance tool', 'image compressor for web'
    ],
    'image format conversion': [
        'image format converter', 'photo format converter', 'convert image format',
        'JPEG PNG converter', 'free image converter', 'online format converter',
        'image file converter', 'photo format changer'
    ],
    'watermarking': [
        'watermark tool', 'watermark maker', 'watermark adder',
        'add watermark', 'free watermark tool', 'photo watermark tool',
        'image watermark tool', 'watermark creator'
    ],
    'video editing': [
        'video editor', 'video editing tool', 'online video editor',
        'free video editor', 'video maker', 'video creator',
        'movie editor', 'video editing software'
    ],
    'audio editing': [
        'audio editor', 'audio editing tool', 'online audio editor',
        'free audio editor', 'audio maker', 'audio creator',
        'sound editor', 'audio editing software'
    ],
    'keyword research': [
        'keyword research', 'keyword analysis', 'keyword discovery',
        'keyword research tool', 'SEO keyword research', 'free keyword research',
        'keyword planning', 'keyword investigation'
    ],
    'keyword ideas': [
        'keyword ideas', 'keyword suggestions', 'keyword brainstorming',
        'keyword inspiration', 'keyword research ideas', 'free keyword ideas',
        'keyword suggestion tool', 'keyword ideation'
    ],
    'keyword discovery': [
        'keyword discovery', 'keyword finder', 'keyword research',
        'new keywords', 'keyword exploration', 'free keyword discovery',
        'keyword suggestion tool', 'keyword ideation'
    ],
    'keyword analysis': [
        'keyword analysis', 'keyword research', 'keyword evaluation',
        'keyword metrics', 'keyword difficulty analysis', 'free keyword analysis',
        'keyword data analysis', 'keyword performance analysis'
    ],
    'keyword planner': [
        'keyword planner', 'keyword planning tool', 'keyword strategy planner',
        'keyword roadmap', 'keyword research planner', 'free keyword planner',
        'keyword campaign planner', 'keyword organizer'
    ],
    'keyword tool': [
        'keyword tool', 'keyword research tool', 'keyword finder tool',
        'keyword analysis tool', 'SEO keyword tool', 'free keyword tool',
        'keyword suggestion tool', 'keyword discovery tool'
    ],
    'keyword finder': [
        'keyword finder', 'keyword search tool', 'keyword discovery tool',
        'keyword research tool', 'find keywords', 'free keyword finder',
        'keyword suggestion finder', 'keyword explorer'
    ],
    'keyword clustering': [
        'keyword clustering', 'keyword grouping', 'keyword segmentation',
        'keyword categorization', 'keyword bucketing', 'free keyword clustering',
        'keyword grouping tool', 'keyword organization'
    ],
    'keyword mapping': [
        'keyword mapping', 'keyword assignment', 'keyword allocation',
        'keyword distribution', 'keyword placement', 'free keyword mapping',
        'keyword mapping tool', 'keyword organization'
    ],
    'keyword strategy': [
        'keyword strategy', 'keyword planning', 'keyword roadmap',
        'SEO keyword strategy', 'keyword targeting strategy', 'free keyword strategy',
        'keyword campaign strategy', 'keyword roadmap template'
    ],
    'search terms': [
        'search terms', 'search queries', 'search keywords',
        'Google search terms', 'search intent terms', 'free search term tool',
        'search term generator', 'search query analysis'
    ],
    'search queries': [
        'search queries', 'search terms', 'search keywords',
        'Google search queries', 'search intent analysis', 'free search query tool',
        'search query generator', 'search term analysis'
    ],
    'search volume': [
        'search volume', 'search volume checker', 'search volume data',
        'monthly search volume', 'search volume analysis', 'free search volume tool',
        'search volume finder', 'search volume metrics'
    ],
    'seed keywords': [
        'seed keywords', 'seed keyword list', 'seed keyword research',
        'starting keywords', 'base keywords', 'free seed keyword tool',
        'seed keyword ideas', 'keyword seeds'
    ],
    'long-tail keywords': [
        'long-tail keywords', 'long tail keyword research', 'long tail phrases',
        'long tail search terms', 'long tail keyword generator', 'free long tail keywords',
        'long tail keyword ideas', 'long tail keyword tool'
    ],
    'semantic keywords': [
        'semantic keywords', 'LSI keywords', 'semantic search terms',
        'semantic keyword research', 'related keywords', 'free semantic keyword tool',
        'semantic keyword ideas', 'semantic keyword analysis'
    ],
    'SEO strategy': [
        'SEO strategy', 'SEO plan', 'search engine optimization strategy',
        'SEO guide', 'SEO planning', 'SEO roadmap',
        'SEO optimization plan', 'search ranking strategy'
    ],
    'on-page SEO': [
        'on-page SEO', 'on-site SEO', 'on page optimization',
        'on-page optimization', 'website SEO', 'page SEO',
        'on page SEO audit', 'on-page SEO checklist'
    ],
    'off-page SEO': [
        'off-page SEO', 'off-site SEO', 'off page optimization',
        'off-page optimization', 'external SEO', 'off page SEO',
        'off page optimization strategy', 'off-page SEO checklist'
    ],
    'technical SEO': [
        'technical SEO', 'site technical audit', 'technical SEO audit',
        'website technical optimization', 'technical SEO checklist',
        'free technical SEO', 'technical SEO guide', 'technical optimization'
    ],
    'local SEO': [
        'local SEO', 'local search optimization', 'Google Maps SEO',
        'local business SEO', 'local ranking', 'local search ranking',
        'local SEO strategy', 'Google Business Profile optimization'
    ],
    'voice search': [
        'voice search', 'voice search optimization', 'voice SEO',
        'voice search ranking', 'voice search strategy', 'free voice search tool',
        'voice search guide', 'voice search for business'
    ],
    'featured snippets': [
        'featured snippets', 'Google featured snippets', 'snippet optimization',
        'position zero', 'featured snippet optimization', 'free featured snippet tool',
        'featured snippet strategy', 'SERP features'
    ],
    'SERP features': [
        'SERP features', 'Google SERP features', 'search engine results features',
        'SERP optimization', 'search result features', 'free SERP tool',
        'SERP analysis', 'Google search features'
    ],
    'organic ranking': [
        'organic ranking', 'organic search ranking', 'Google ranking',
        'search ranking', 'organic traffic', 'organic SEO',
        'natural search ranking', 'search engine ranking'
    ],
    'organic traffic': [
        'organic traffic', 'natural traffic', 'free traffic',
        'search engine traffic', 'Google organic traffic', 'organic website traffic',
        'organic visit', 'organic visitor'
    ],
    'backlinks': [
        'backlinks', 'inbound links', 'backlink analysis',
        'backlink checker', 'backlink building', 'backlink strategy',
        'link profile', 'link building strategy'
    ],
    'link building': [
        'link building', 'backlink builder', 'link acquisition',
        'backlink strategy', 'link building strategy', 'link outreach',
        'backlink building', 'link earning'
    ],
    'domain authority': [
        'domain authority', 'DA score', 'domain rating',
        'domain trust', 'domain strength', 'free domain authority checker',
        'domain authority checker', 'domain metrics'
    ],
    'site audit': [
        'site audit', 'SEO audit', 'website audit',
        'site health check', 'SEO site audit', 'website SEO audit',
        'site analysis', 'website performance audit'
    ],
    'content optimization': [
        'content optimization', 'SEO content optimization', 'article optimizer',
        'content SEO', 'on-page content optimization', 'content optimization tool',
        'blog post optimization', 'website content optimizer'
    ],
    'content marketing': [
        'content marketing', 'content promotion', 'content strategy',
        'digital content marketing', 'content marketing strategy',
        'content creation marketing', 'blog marketing', 'content distribution'
    ],
    'social media marketing': [
        'social media marketing', 'social media strategy', 'social media promotion',
        'social media advertising', 'social media management',
        'social media growth', 'social media campaign', 'social media branding'
    ],
    'email marketing': [
        'email marketing', 'email campaign', 'email newsletter',
        'email automation', 'email marketing strategy', 'email promotion',
        'email outreach', 'email marketing tool'
    ],
    'digital marketing': [
        'digital marketing', 'online marketing', 'internet marketing',
        'digital advertising', 'digital marketing strategy',
        'digital promotion', 'online advertising', 'web marketing'
    ]
};

const TOOL_NAME_VARIANTS = {
    'background removal': 'background remover',
    'image compression': 'image compressor',
    'image conversion': 'image converter',
    'photo editing': 'photo editor',
    'image cropping': 'image cropper',
    'image upscaling': 'image upscaler',
    'image optimization': 'image optimizer',
    'image resizing': 'image resizer',
    'image format conversion': 'image format converter',
    'watermarking': 'watermark tool',
    'background removal tool': 'background remover',
    'remove background': 'background remover'
};

const ABSTRACT_TO_TOOL = {
    'background removal': 'background remover', 'image compression': 'image compressor',
    'image conversion': 'image converter', 'photo editing': 'photo editor',
    'image cropping': 'image cropper', 'image upscaling': 'image upscaler',
    'image optimization': 'image optimizer', 'image resizing': 'image resizer',
    'image format': 'image format converter', 'watermarking': 'watermark tool'
};

const IMAGE_TOOL_CATEGORIES = {
    'image compressor': {
        category: 'compression', noun: 'image compression', verb: 'compress images',
        related: ['compress images', 'image compression', 'reduce image size', 'reduce file size', 'compress JPEG', 'compress PNG', 'compress WebP', 'lossless compression', 'lossy compression', 'optimize images', 'image optimization', 'batch image compression', 'online image compressor', 'free image compressor', 'image quality', 'web performance', 'page speed', 'Core Web Vitals']
    },
    'background remover': {
        category: 'background', noun: 'background removal', verb: 'remove background',
        related: ['remove background', 'transparent background', 'AI background remover', 'automatic background removal', 'remove white background', 'PNG background remover', 'product photo background remover', 'portrait background remover', 'photo cutout', 'background eraser', 'remove image background', 'online background remover', 'free background remover', 'remove background without Photoshop', 'batch background removal', 'e-commerce product photos', 'image editing']
    },
    'image resizer': {
        category: 'resizing', noun: 'image resizing', verb: 'resize images',
        related: ['resize image', 'resize photos', 'change image dimensions', 'aspect ratio', 'reduce image size', 'batch resize images', 'image resolution', 'resize for web', 'resize for social media', 'social media image sizes', 'online image resizer', 'free image resizer', 'responsive images', 'resize PNG', 'resize JPEG', 'image scaling']
    },
    'image converter': {
        category: 'conversion', noun: 'image conversion', verb: 'convert images',
        related: ['convert images', 'image format converter', 'convert JPEG to PNG', 'convert PNG to WebP', 'convert HEIC to JPEG', 'convert RAW to JPEG', 'convert SVG', 'change image format', 'batch convert images', 'online image converter', 'free image converter', 'HEIC converter', 'RAW converter', 'image file types', 'WebP converter', 'AVIF converter']
    },
    'image upscaler': {
        category: 'upscaling', noun: 'image upscaling', verb: 'upscale images',
        related: ['upscale image', 'enlarge image', 'increase resolution', 'AI image upscaler', 'image upscaling', 'enlarge without losing quality', 'super resolution', 'HD image upscale', 'online image upscaler', 'free image upscaler', 'image quality enhancer', 'photo enhancer', 'upscale PNG', 'upscale JPEG', 'upscale photo', 'image enlargement']
    },
    'watermark tool': {
        category: 'watermark', noun: 'watermarking', verb: 'add watermark',
        related: ['add watermark', 'watermark image', 'photo watermark', 'batch watermark', 'add watermark to photo', 'logo watermark', 'text watermark', 'image copyright protection', 'online watermark remover', 'free watermark tool', 'watermark remover', 'batch watermark removal', 'image branding', 'protect images online']
    },
    'photo editor': {
        category: 'editing', noun: 'photo editing', verb: 'edit photos',
        related: ['edit photos', 'online photo editor', 'free photo editor', 'photo editing software', 'image editing', 'photo retouching', 'color correction', 'photo filters', 'photo manipulation', 'batch photo editing', 'Photoshop alternative', 'photo enhancer', 'image adjustments', 'crop and resize photo', 'add text to photo', 'photo effects']
    },
    'image cropper': {
        category: 'cropping', noun: 'image cropping', verb: 'crop images',
        related: ['crop image', 'crop photo', 'online image cropper', 'free image cropper', 'batch crop images', 'crop to aspect ratio', 'auto crop', 'smart crop', 'remove unwanted areas', 'image framing', 'crop circle', 'crop square', 'photo composition', 'crop PNG', 'crop JPEG']
    },
    'image optimizer': {
        category: 'optimization', noun: 'image optimization', verb: 'optimize images',
        related: ['optimize images', 'image optimization', 'optimize images for web', 'compress images for web', 'reduce file size', 'page speed optimization', 'Core Web Vitals', 'image CDN', 'lazy loading images', 'next-gen image formats', 'WebP images', 'responsive images', 'online image optimizer', 'free image optimizer', 'batch image optimization', 'website performance']
    },
    'image format converter': {
        category: 'format', noun: 'image format conversion', verb: 'convert image formats',
        related: ['convert image formats', 'JPEG to PNG', 'PNG to WebP', 'WebP to JPEG', 'HEIC to JPEG', 'RAW to JPEG', 'SVG converter', 'batch format conversion', 'online format converter', 'free format converter', 'AVIF converter', 'image file format', 'lossless format conversion', 'GIF converter', 'BMP converter']
    }
};

// ============================================
// TOPIC SCOPE FILTER - Closed domain enforcement
// ============================================
const TOPIC_SCOPES = {
    'markdown editor': {
        allowed: ['markdown', 'readme', 'documentation', 'technical writing', 'github', 'html', 'text formatting',
            'writing', 'code', 'developer', 'notes', 'syntax', 'tables', 'headings', 'links', 'images', 'lists',
            'code blocks', 'export', 'open source', 'free', 'online', 'preview', 'cheat sheet', 'pandoc', 'wysiwyg',
            'distraction-free', 'parsing', 'md file', 'plain text', 'rich text', 'text editor', 'writer',
            'editor', 'formatting', 'markup', 'md format', 'documentation generator'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword|keyword research|keyword planner|keyword tool|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'code editor': {
        allowed: ['code', 'editor', 'programming', 'ide', 'syntax', 'highlighting', 'autocomplete', 'debugging',
            'extensions', 'plugins', 'themes', 'terminal', 'git', 'version control', 'refactoring', 'linting',
            'code completion', 'intellisense', 'sublime', 'vscode', 'vim', 'emacs', 'notepad++', 'brackets'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce|photo editing|image compression|background remover)\b/i
    },
    'text editor': {
        allowed: ['text', 'editor', 'notepad', 'writing', 'code', 'plain text', 'rich text', 'syntax', 'highlighting',
            'search', 'replace', 'undo', 'redo', 'tabs', 'split view', 'word wrap', 'line numbers', 'minimal',
            'distraction-free', 'markdown', 'formatting', 'open source'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword|keyword research|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce|photo editing|image compression|background remover|video editing)\b/i
    },
    'video editor': {
        allowed: ['video', 'editing', 'trim', 'cut', 'merge', 'split', 'transition', 'effect', 'filter',
            'subtitle', 'caption', 'text overlay', 'audio', 'music', 'voiceover', 'render', 'export', 'timeline',
            'keyframe', 'animation', 'motion', 'color grading', 'color correction', 'stabilization', 'chroma key',
            'greenscreen', 'crop', 'rotate', 'scale', 'speed', 'slow motion', 'reverse', 'loop', 'crop',
            'aspect ratio', 'resolution', 'frame rate', 'codec', 'format', 'compression', 'quality',
            'youtube', 'tiktok', 'instagram', 'reels', 'shorts', 'vlog', 'tutorial', 'presentation',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle editor|keyword research|keyword planner|seo tool|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|photo editing|image compression|background remover|image resizer|image converter|image upscaler|watermark tool|image cropper|image optimizer)\b/i
    },
    'subtitle editor': {
        allowed: ['subtitle', 'caption', 'srt', 'vtt', 'ass', 'ssa', 'transcription', 'translation', 'timings',
            'sync', 'timestamp', 'text', 'font', 'style', 'position', 'alignment', 'effects', 'karaoke',
            'burn-in', 'soft sub', 'hard sub', 'closed caption', 'open caption', 'accessibility',
            'video subtitle', 'movie subtitle', 'anime subtitle', 'youtube subtitle', 'auto subtitle',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|photo editing|image compression|background remover|image resizer|image converter|image upscaler|watermark tool|image cropper|image optimizer|video editing|screen recorder)\b/i
    },
    'image compressor': {
        allowed: ['image', 'photo', 'picture', 'compress', 'compression', 'reduce', 'file size', 'optimize',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'svg', 'bmp', 'tiff', 'heic', 'raw',
            'quality', 'lossless', 'lossy', 'batch', 'bulk', 'resize', 'dimensions', 'resolution',
            'web', 'page speed', 'core web vitals', 'loading', 'performance', 'cdn', 'lazy loading',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'background remover': {
        allowed: ['background', 'remove', 'removal', 'transparent', 'cutout', 'photo', 'image', 'picture',
            'portrait', 'product', 'subject', 'object', 'detect', 'ai', 'automatic', 'manual', 'eraser',
            'brush', 'magic', 'precision', 'edge', 'feather', 'mask', 'layer', 'composite', 'blend',
            'white background', 'color background', 'blur background', 'replace background',
            'e-commerce', 'product photo', 'passport photo', 'profile picture', 'headshot',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image resizer': {
        allowed: ['image', 'photo', 'picture', 'resize', 'resizer', 'dimensions', 'width', 'height',
            'scale', 'resolution', 'aspect ratio', 'crop', 'fit', 'fill', 'stretch', 'compress',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'svg', 'bmp', 'tiff', 'heic', 'raw',
            'batch', 'bulk', 'multiple', 'social media', 'profile', 'banner', 'thumbnail', 'cover',
            'web', 'responsive', 'retina', 'dpi', 'ppi', 'pixel', 'vector', 'raster',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image converter': {
        allowed: ['image', 'photo', 'picture', 'convert', 'conversion', 'format', 'jpeg', 'jpg', 'png',
            'webp', 'gif', 'avif', 'svg', 'bmp', 'tiff', 'heic', 'raw', 'pdf', 'eps', 'psd', 'ai',
            'change', 'transform', 'export', 'import', 'batch', 'bulk', 'multiple', 'lossless', 'lossy',
            'quality', 'compression', 'color space', 'color profile', 'icc profile', 'alpha channel',
            'transparency', 'metadata', 'exif', 'icc', 'color depth', 'bit depth',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image upscaler': {
        allowed: ['image', 'photo', 'picture', 'upscale', 'upscaling', 'enlarge', 'resolution', 'scale',
            'magnify', 'zoom', 'detail', 'sharpness', 'clarity', 'ai', 'machine learning', 'super resolution',
            'interpolation', 'nearest neighbor', 'bicubic', 'bilinear', 'lanczos', 'denoise', 'deblur',
            'restore', 'enhance', 'improve', 'quality', 'artifact', 'pixelation', 'blur', 'noise',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'avif', 'bmp', 'tiff', 'heic', 'raw',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'watermark tool': {
        allowed: ['watermark', 'text', 'logo', 'image', 'photo', 'picture', 'brand', 'copyright', 'protect',
            'overlay', 'opacity', 'position', 'size', 'rotation', 'tile', 'repeat', 'custom', 'template',
            'batch', 'bulk', 'multiple', 'add', 'remove', 'eraser', 'inpaint', 'reconstruct',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'pdf', 'video',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'photo editor': {
        allowed: ['photo', 'image', 'picture', 'edit', 'editing', 'crop', 'rotate', 'flip', 'resize',
            'brightness', 'contrast', 'saturation', 'hue', 'exposure', 'white balance', 'temperature',
            'tint', 'vibrance', 'clarity', 'sharpness', 'blur', 'sharpen', 'denoise', 'retouch',
            'filters', 'presets', 'luts', 'color grading', 'color correction', ' curves', 'levels',
            'layers', 'masks', 'selection', 'brush', 'clone stamp', 'healing', 'patch', 'red eye',
            'text', 'draw', 'shapes', 'frames', 'borders', 'effects', 'stickers',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'raw', 'heic', 'tiff', 'bmp',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image cropper': {
        allowed: ['image', 'photo', 'picture', 'crop', 'cropping', 'trim', 'cut', 'frame', 'composition',
            'aspect ratio', 'freeform', 'square', 'portrait', 'landscape', 'panoramic', '16:9', '4:3', '1:1',
            'rotate', 'flip', 'straighten', 'horizon', 'level', 'perspective', 'distort', 'warp',
            'batch', 'bulk', 'multiple', 'auto crop', 'smart crop', 'content-aware', 'edge detection',
            'jpeg', 'jpg', 'png', 'webp', 'gif', 'bmp', 'tiff', 'heic', 'raw',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image optimizer': {
        allowed: ['image', 'photo', 'picture', 'optimize', 'optimization', 'compress', 'compression',
            'reduce', 'file size', 'quality', 'web', 'performance', 'page speed', 'core web vitals',
            'loading', 'lazy loading', 'cdn', 'responsive', 'retina', 'next-gen', 'format',
            'webp', 'avif', 'jpeg', 'jpg', 'png', 'gif', 'svg', 'bmp', 'tiff', 'heic', 'raw',
            'batch', 'bulk', 'multiple', 'auto', 'lossless', 'lossy', 'metadata', 'exif',
            'cache', 'preload', 'preload', 'above the fold', 'critical css', 'critical path',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    },
    'image format converter': {
        allowed: ['image', 'photo', 'picture', 'convert', 'conversion', 'format', 'jpeg', 'jpg', 'png',
            'webp', 'gif', 'avif', 'svg', 'bmp', 'tiff', 'heic', 'raw', 'pdf', 'eps', 'psd', 'ai',
            'change', 'transform', 'export', 'import', 'batch', 'bulk', 'multiple', 'lossless', 'lossy',
            'quality', 'compression', 'color space', 'color profile', 'icc profile', 'alpha channel',
            'transparency', 'metadata', 'exif', 'icc', 'color depth', 'bit depth',
            'free', 'online', 'desktop', 'professional', 'beginner', 'alternative', 'best'],
        banned: /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license|video editing|screen recorder|podcast|youtube|tiktok|instagram|facebook|twitter|social media|email marketing|crm|ecommerce|shopify|woocommerce)\b/i
    }
};

const TOPIC_SCOPE_GENERAL_BANNED = /\b(subtitle|closed caption|srt|vtt|transcription|seo|keyword research|keyword planner|password|qr code|invoice|shipping|tax|payment|shopping|pricing|coupon|discount|subscription|license)\b/i;

const INTENT_GROUPS = [
    'how to', 'tutorial', 'guide', 'comparison', 'alternatives',
    'best tool', 'free tool', 'online tool', 'examples', 'best practices',
    'workflow', 'tips', 'SEO', 'performance', 'vs'
];

const CONCEPT_ACTION_MAP = {
    'keyword research': 'research keywords',
    'keyword ideas': 'find keyword ideas',
    'keyword discovery': 'discover keywords',
    'keyword analysis': 'analyze keywords',
    'keyword planner': 'plan keywords',
    'keyword tool': 'use keyword tools',
    'keyword finder': 'find keywords',
    'keyword generator': 'generate keywords',
    'keyword clustering': 'cluster keywords',
    'keyword mapping': 'map keywords',
    'keyword strategy': 'develop a keyword strategy',
    'search terms': 'search for terms',
    'search queries': 'search for queries',
    'search volume': 'check search volume',
    'seed keywords': 'find seed keywords',
    'focus keywords': 'choose focus keywords',
    'long-tail keywords': 'find long-tail keywords',
    'semantic keywords': 'find semantic keywords',
    'SEO strategy': 'develop an SEO strategy',
    'content strategy': 'develop a content strategy',
    'on-page SEO': 'optimize on-page SEO',
    'off-page SEO': 'improve off-page SEO',
    'technical SEO': 'fix technical SEO',
    'link building': 'build backlinks',
    'domain authority': 'increase domain authority',
    'site audit': 'audit a website',
    'content optimization': 'optimize content',
    'content marketing': 'develop a content marketing strategy',
    'image converter': 'convert images',
    'image compressor': 'compress images',
    'image editor': 'edit images',
    'photo editor': 'edit photos',
    'image resizer': 'resize images',
    'image cropper': 'crop images',
    'image optimizer': 'optimize images',
    'background remover': 'remove background',
    'image upscaler': 'upscale images',
    'photo enhancer': 'enhance photos',
    'image compression': 'compress images',
    'image optimization': 'optimize images',
    'optimize images for web': 'optimize images for web',
    'reduce file size': 'reduce file size',
    'reduce image size': 'reduce image size',
    'compress JPEG': 'compress JPEG',
    'compress PNG': 'compress PNG',
    'compress WebP': 'compress WebP',
    'lossless compression': 'compress without losing quality',
    'lossy compression': 'compress with quality loss',
    'image quality': 'improve image quality',
    'background removal': 'remove background',
    'remove image background': 'remove background',
    'transparent background': 'make background transparent',
    'image resizing': 'resize images',
    'resize image': 'resize images',
    'change image dimensions': 'change image dimensions',
    'image scaling': 'scale images',
    'image resolution': 'improve image resolution',
    'image upscaling': 'upscale images',
    'upscale image': 'upscale images',
    'increase resolution': 'increase image resolution',
    'AI upscaling': 'upscale images with AI',
    'image enhancement': 'enhance images',
    'image cropping': 'crop images',
    'crop photo': 'crop photos',
    'image conversion': 'convert images',
    'image format conversion': 'convert image formats',
    'convert JPEG': 'convert JPEG files',
    'convert PNG': 'convert PNG files',
    'convert WebP': 'convert WebP files',
    'convert SVG': 'convert SVG files',
    'image format converter': 'convert image formats',
    'change image format': 'change image format',
    'HEIC to JPEG': 'convert HEIC to JPEG',
    'RAW to JPEG': 'convert RAW to JPEG',
    'image editing': 'edit images',
    'photo editing': 'edit photos',
    'edit image': 'edit images',
    'image retouching': 'retouch images',
    'color correction': 'correct colors',
    'photo filters': 'apply photo filters',
    'image adjustments': 'adjust images',
    'photo enhancement': 'enhance photos',
    'watermark image': 'add watermark to images',
    'add watermark to photo': 'add watermark to photos',
    'protect copyright': 'protect copyright',
    'batch watermark': 'watermark images in batch',
    'batch compression': 'compress images in batch',
    'batch resize': 'resize images in batch',
    'web performance': 'improve web performance',
    'page speed': 'improve page speed',
    'image performance': 'optimize image performance',
    'responsive images': 'create responsive images',
    'web optimization': 'optimize for web',
    'image CDN': 'use image CDN',
    'lazy loading': 'implement lazy loading',
    'next-gen formats': 'use next-gen image formats',
    'background removal': 'remove background',
    'image compression': 'compress images',
    'image resizing': 'resize images',
    'image conversion': 'convert images',
    'image upscaling': 'upscale images',
    'photo editing': 'edit photos',
    'image cropping': 'crop images',
    'image optimization': 'optimize images',
    'image format conversion': 'convert image formats',
    'watermarking': 'add watermarks',
    'photo cutout': 'create photo cutouts',
    'background eraser': 'erase backgrounds',
    'transparent background': 'make background transparent',
    'image enlarger': 'enlarge images',
    'image enhancement': 'enhance images',
    'photo enhancement': 'enhance photos',
    'image retouching': 'retouch images',
    'color correction': 'correct colors',
    'online image editor': 'edit images online',
    'free photo editor': 'edit photos for free',
    'Photoshop alternative': 'edit images without Photoshop',
    'remove white background': 'remove white background from images',
    'AI background remover': 'remove background with AI',
    'AI image upscaler': 'upscale images with AI',
    'image quality': 'improve image quality',
    'web performance': 'improve web performance',
    'batch processing': 'process images in batch',
    'remove image background': 'remove image background',
    'remove background without Photoshop': 'remove background without Photoshop',
    'batch background removal': 'remove backgrounds in batch',
    'batch watermark removal': 'remove watermarks in batch',
    'watermark remover': 'remove watermark',
    'reduce image size': 'reduce image size',
    'reduce file size': 'reduce file size',
    'batch image compression': 'compress images in batch',
    'resize photos': 'resize photos',
    'batch resize images': 'resize images in batch',
    'resize PNG': 'resize PNG images',
    'resize JPEG': 'resize JPEG images',
    'convert JPEG to PNG': 'convert JPEG to PNG',
    'convert PNG to WebP': 'convert PNG to WebP',
    'convert HEIC to JPEG': 'convert HEIC to JPEG',
    'convert RAW to JPEG': 'convert RAW to JPEG',
    'batch convert images': 'convert images in batch',
    'enlarge image': 'enlarge image',
    'increase resolution': 'increase image resolution',
    'upscale PNG': 'upscale PNG images',
    'upscale JPEG': 'upscale JPEG images',
    'upscale photo': 'upscale photo',
    'enlarge without losing quality': 'enlarge without losing quality',
    'add watermark': 'add watermark',
    'photo retouching': 'retouch photos',
    'photo filters': 'apply photo filters',
    'crop and resize photo': 'crop and resize photos',
    'add text to photo': 'add text to photo',
    'crop image': 'crop image',
    'batch crop images': 'crop images in batch',
    'crop to aspect ratio': 'crop to aspect ratio',
    'crop PNG': 'crop PNG images',
    'crop JPEG': 'crop JPEG images',
    'compress images for web': 'compress images for web',
    'lazy loading images': 'implement lazy loading images',
    'batch image optimization': 'optimize images in batch',
    'JPEG to PNG': 'convert JPEG to PNG',
    'PNG to WebP': 'convert PNG to WebP',
    'WebP to JPEG': 'convert WebP to JPEG',
    'HEIC to JPEG': 'convert HEIC to JPEG',
    'RAW to JPEG': 'convert RAW to JPEG',
    'batch format conversion': 'convert formats in batch',
    'lossless format conversion': 'convert formats losslessly',
    'GIF converter': 'convert GIF files',
    'BMP converter': 'convert BMP files',
    'photo effects': 'apply photo effects',
    'video editor': 'edit videos',
    'video converter': 'convert videos',
    'video compressor': 'compress videos',
    'video merger': 'merge videos',
    'video trimmer': 'trim videos',
    'screen recorder': 'record your screen',
    'video downloader': 'download videos',
    'subtitle editor': 'edit subtitles',
    'content writing': 'write content',
    'copywriting': 'write copy',
    'blog writing': 'write blog posts',
    'article writing': 'write articles',
    'SEO writing': 'write SEO-optimized content',
    'grammar checker': 'check grammar',
    'plagiarism checker': 'check for plagiarism',
    'word counter': 'count words',
    'graphic design': 'create graphic designs',
    'logo design': 'design a logo',
    'brand design': 'design brand identity',
    'social media marketing': 'market on social media',
    'email marketing': 'run email marketing campaigns',
    'digital marketing': 'do digital marketing',
    'business plan': 'write a business plan',
    'market research': 'conduct market research',
    'web development': 'build a website',
    'coding': 'learn to code',
    'programming': 'learn programming',
    'machine learning': 'build machine learning models',
    'data science': 'learn data science',
    'online store': 'build an online store',
    'ecommerce platform': 'set up an ecommerce platform'
};

const SYNONYM_GROUPS = [
    ['basics', 'fundamentals', 'introduction', 'overview', '101', 'primer', 'intro', 'getting started'],
    ['guide', 'tutorial', 'walkthrough', 'step-by-step', 'instructions', 'manual', 'handbook'],
    ['best', 'top', 'leading', 'premier', 'recommended', 'top-rated', 'ultimate'],
    ['free', 'no-cost', 'open source'],
    ['tool', 'software', 'app', 'application', 'platform', 'program', 'utility'],
    ['fast', 'quick', 'rapid', 'lightweight'],
    ['easy', 'simple', 'straightforward', 'effortless', 'beginner-friendly'],
    ['professional', 'expert', 'advanced', 'pro', 'enterprise', 'powerful'],
    ['online', 'web-based', 'cloud', 'SaaS', 'browser-based'],
    ['creator', 'builder', 'maker', 'generator', 'studio'],
    ['find', 'discover', 'search for', 'locate', 'get', 'look up'],
    ['improve', 'enhance', 'optimize', 'boost', 'upgrade', 'refine'],
    ['remove', 'delete', 'eliminate', 'strip', 'clean', 'get rid of'],
    ['analyze', 'examine', 'evaluate', 'assess', 'review', 'inspect', 'audit'],
    ['create', 'make', 'build', 'generate', 'produce', 'develop'],
    ['compare', 'versus', 'vs', 'comparison', 'alternatives']
];

const AUDIENCES = [
    'beginners', 'professionals', 'small businesses',
    'bloggers', 'content creators', 'SEO professionals',
    'digital marketers', 'website owners', 'agencies',
    'local businesses', 'ecommerce stores', 'affiliate marketers',
    'YouTubers', 'SaaS companies', 'freelancers',
    'startups', 'students', 'photographers', 'WordPress users',
    'web developers', 'designers'
];

const QUERY_PATTERNS = {
    informational: [
        '{concept} guide',
        'how to {concept_action}',
        'what is {concept}',
        '{concept} tutorial',
        '{concept} for beginners',
        '{concept} tips',
        '{concept} best practices',
        '{concept} examples',
        '{concept} checklist',
        'why use {concept}',
        '{concept} pros and cons',
        'complete guide to {concept}',
        '{concept} explained',
        '{concept} step by step',
        '{concept} workflow'
    ],
    commercial: [
        'best {concept}',
        'top {concept}',
        'best {concept} for {audience}',
        '{concept} tools',
        '{concept} software',
        '{concept} alternatives',
        '{concept} reviews',
        '{concept} comparison',
        '{concept} features',
        'free {concept}',
        '{concept} {year}'
    ],
    transactional: [
        '{concept} online',
        'get {concept}',
        'try {concept}',
        '{concept} for teams',
        '{concept} for enterprises'
    ],
    action: [
        '{concept_action} online',
        '{concept_action} free',
        '{concept_action} for beginners',
        '{concept_action} step by step',
        'best tool to {concept_action}',
        '{concept_action} tutorial',
        '{concept_action} with AI',
        'how to {concept_action}',
        '{concept_action} for {audience}'
    ]
};

const UNSOUND_COMBINATIONS = [
    /\b(article|blog|post|guide|tutorial|video|tool|software|app|platform|strategy|plan|tips|ideas|examples|checklist|templates)\s+(article|blog|post|guide|tutorial|video|tool|software|app|platform|strategy|plan|tips|ideas|examples|checklist|templates)\b/i,
    /\b(generate|compress|convert|remove|resize|optimize|download|upload|install|setup)\s+(article|blog|post|guide|tutorial|video|tool|software|app|platform|strategy|plan|tips|ideas|examples)\b/i,
    /\b(article|blog|post)\s+(seo|marketing|strategy|ranking|research)\b/i,
    /\b(keywords?|keyword)\s+(keyword|keywords?)\b/i
];

// ============================================
// STAGE 1: TOPIC ANALYZER
// ============================================

class TopicAnalyzer {
    analyze(topic) {
        const trimmed = topic.trim();
        const topicType = Utils.detectKeywordType(trimmed);
        const words = trimmed.toLowerCase().split(/\s+/);
        const seeds = words.filter(w => w.length > 2);
        const imageTool = this._detectImageTool(trimmed);
        const normalizedTopic = imageTool ? imageTool.name : trimmed;
        return { topic: normalizedTopic, type: topicType, seeds, wordCount: words.length, imageTool };
    }

    _detectImageTool(topic) {
        const lower = topic.toLowerCase().trim();
        const normalized = TOOL_NAME_VARIANTS[lower] || lower;

        for (const [toolName, toolInfo] of Object.entries(IMAGE_TOOL_CATEGORIES)) {
            if (normalized === toolName || normalized.indexOf(toolName) !== -1) return { ...toolInfo, name: toolName };
            if (lower === toolName || lower.indexOf(toolName) !== -1) return { ...toolInfo, name: toolName };
        }
        for (const [toolName, toolInfo] of Object.entries(IMAGE_TOOL_CATEGORIES)) {
            const lastWord = toolName.split(/\s+/).pop();
            if ((normalized.indexOf(lastWord) !== -1 || lower.indexOf(lastWord) !== -1) && (lower.indexOf('image') !== -1 || lower.indexOf('photo') !== -1 || lower.indexOf('picture') !== -1 || lower.indexOf('background') !== -1)) {
                return { ...toolInfo, name: toolName };
            }
        }
        return null;
    }
}

// ============================================
// STAGE 2: CONCEPT EXPANDER
// ============================================

class ConceptExpander {
    expand(analysis) {
        const domains = this._mapTypeToDomains(analysis.type);
        const allConcepts = [];

        for (const domain of domains) {
            if (DOMAIN_CONCEPTS[domain]) {
                for (const concept of DOMAIN_CONCEPTS[domain]) {
                    if (CONCEPT_PROFILES[concept]) {
                        allConcepts.push(concept);
                    }
                }
            }
        }

        if (analysis.imageTool) {
            if (CONCEPT_PROFILES[analysis.imageTool.name]) {
                allConcepts.push(analysis.imageTool.name);
            }
            if (analysis.imageTool.related) {
                for (const rel of analysis.imageTool.related) {
                    if (CONCEPT_PROFILES[rel]) {
                        allConcepts.push(rel);
                    }
                }
            }
        }

        const topicLower = analysis.topic.toLowerCase();
        const topicWords = analysis.seeds;

        const exactMatch = CONCEPT_PROFILES[topicLower];
        if (exactMatch) {
            allConcepts.unshift(topicLower);
        }

        const unique = [...new Set(allConcepts)];
        const scored = unique.map(c => {
            let s = 0;
            const cl = c.toLowerCase();
            for (const w of topicWords) {
                if (w.length > 2 && cl.indexOf(w) !== -1) s += 10;
            }
            if (cl.indexOf(topicLower) !== -1 || topicLower.indexOf(cl) !== -1) s += 25;
            if (exactMatch && cl === topicLower) s += 50;
            return { concept: c, score: s };
        });

        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 15);
    }

    _mapTypeToDomains(type) {
        const map = {
            'seo': ['seo'], 'image': ['image'], 'video': ['video'],
            'programming': ['programming'], 'ecommerce': ['ecommerce'],
            'content': ['content'], 'social': ['social'], 'business': ['business'],
            'design': ['design'], 'ai': ['ai'],
            'tool': ['seo', 'image', 'video', 'programming', 'design', 'ai', 'content'],
            'product': ['ecommerce', 'business', 'design'],
            'service': ['business', 'ecommerce', 'content'],
            'general': ['seo', 'content', 'business', 'design'],
            'action': ['seo', 'image', 'video', 'programming', 'design', 'ai', 'content', 'social'],
            'file-format': ['image', 'video', 'programming']
        };
        return map[type] || ['general'];
    }
}

// ============================================
// STAGE 2.5: TOPIC SCOPE FILTER (Closed Domain Enforcement)
// ============================================

class TopicScopeFilter {
    constructor() {
        this._toolSuffixes = ['editor', 'tool', 'software', 'app', 'platform', 'compressor', 'converter',
            'resizer', 'cropper', 'optimizer', 'upscaler', 'remover', 'enhancer', 'planner', 'generator',
            'checker', 'counter', 'tracker', 'manager', 'builder', 'maker', 'creator', 'assistant',
            'helper', 'utility'];
    }

    _getScope(analysis) {
        const toolName = analysis.imageTool ? analysis.imageTool.name : analysis.topic.toLowerCase().trim();
        if (TOPIC_SCOPES[toolName]) return TOPIC_SCOPES[toolName];
        return null;
    }

    _getMainWords(analysis) {
        return analysis.seeds.filter(w => w.length > 2 && this._toolSuffixes.indexOf(w) === -1);
    }

    _isBanned(text, analysis) {
        const lower = text.toLowerCase();
        if (TOPIC_SCOPE_GENERAL_BANNED.test(lower)) return true;
        if (analysis) {
            const scope = this._getScope(analysis);
            if (scope && scope.banned && scope.banned.test(lower)) return true;
        }
        return false;
    }

    _isRelevant(text, analysis) {
        const scope = this._getScope(analysis);
        const textLower = text.toLowerCase();

        if (scope) {
            for (const allowed of scope.allowed) {
                const aLower = allowed.toLowerCase();
                if (textLower.indexOf(aLower) !== -1 || aLower.indexOf(textLower) !== -1) return true;
            }
        }

        const mainWords = this._getMainWords(analysis);
        for (const w of mainWords) {
            if (textLower.indexOf(w) !== -1) return true;
        }

        if (analysis.imageTool && analysis.imageTool.related) {
            for (const rel of analysis.imageTool.related) {
                const rLower = rel.toLowerCase();
                if (textLower.indexOf(rLower) !== -1 || rLower.indexOf(textLower) !== -1) return true;
            }
        }

        const topicLower = analysis.topic.toLowerCase();
        const textWords = textLower.split(/\s+/);
        for (const tw of textWords) {
            if (tw.length > 4 && topicLower.indexOf(tw) !== -1) return true;
        }
        const topicWords = topicLower.split(/\s+/);
        for (const tpw of topicWords) {
            if (tpw.length > 4 && textLower.indexOf(tpw) !== -1) return true;
        }

        return false;
    }

    filterConcepts(concepts, analysis) {
        return concepts.filter(entry => {
            const concept = typeof entry === 'string' ? entry : entry.concept;
            if (this._isBanned(concept, analysis)) return false;
            if (!this._isRelevant(concept, analysis)) return false;
            return true;
        });
    }

    filterKeywords(keywords, analysis) {
        return keywords.filter(kw => {
            const lower = kw.toLowerCase();
            if (this._isBanned(lower, analysis)) return false;
            const mainWords = this._getMainWords(analysis);
            if (mainWords.length === 0) return true;
            for (const w of mainWords) {
                if (lower.indexOf(w) !== -1) return true;
            }
            if (analysis.imageTool && analysis.imageTool.related) {
                for (const rel of analysis.imageTool.related) {
                    if (lower.indexOf(rel.toLowerCase()) !== -1) return true;
                }
            }
            const topicLower = analysis.topic.toLowerCase();
            for (const tw of topicLower.split(/\s+/)) {
                if (tw.length > 4 && lower.indexOf(tw) !== -1) return true;
            }
            return false;
        });
    }
}

// ============================================
// STAGE 3: QUERY BUILDER
// ============================================

class QueryBuilder {
    constructor() {
        this.year = new Date().getFullYear();
    }

    build(concepts, analysis) {
        const queries = [];
        const topicLower = analysis.topic.toLowerCase();

        for (let i = 0; i < concepts.length; i++) {
            const entry = concepts[i];
            const concept = typeof entry === 'string' ? entry : entry.concept;
            const profile = CONCEPT_PROFILES[concept];

            if (profile) {
                const curated = CURATED_QUERIES[concept];
                if (curated) {
                    for (const q of curated) {
                        queries.push(q);
                    }
                }

                const templates = profile.templates || [];
                const modifiers = profile.modifiers || [];
                const verbs = profile.allowedVerbs || [];

                for (let t = 0; t < templates.length && t < 6; t++) {
                    const template = templates[t];
                    const verb = verbs[t % verbs.length];
                    const modifier = modifiers[t % modifiers.length];
                    let q = template
                        .replace(/\{verb\}/g, verb)
                        .replace(/\{concept\}/g, concept)
                        .replace(/\{modifier\}/g, modifier)
                        .replace(/\{year\}/g, this.year);
                    q = q.charAt(0).toUpperCase() + q.slice(1);
                    if (q && q.length >= 10 && q.length < 80) {
                        queries.push(q);
                    }
                }
            } else {
                const actionForm = CONCEPT_ACTION_MAP[concept.toLowerCase()];
                if (actionForm) {
                    queries.push('How to ' + actionForm);
                    queries.push(this._titleCase(concept) + ' tutorial');
                    queries.push('Complete guide to ' + concept.toLowerCase());
                }
            }
        }

        const topicProfile = CONCEPT_PROFILES[topicLower];
        if (topicProfile) {
            const curated = CURATED_QUERIES[topicLower];
            if (curated) {
                for (const q of curated) {
                    queries.push(q);
                }
            }
        }

        return queries.filter(q => q && q.length >= 10 && q.length < 80);
    }

    _titleCase(str) {
        const acronyms = ['seo', 'ai', 'ppc', 'roi', 'crm', 'api', 'url', 'html', 'css', 'ux', 'ui', 'erp', 'saas'];
        return str.split(' ').map(w => {
            if (acronyms.indexOf(w.toLowerCase()) !== -1) return w.toUpperCase();
            return w.charAt(0).toUpperCase() + w.slice(1);
        }).join(' ');
    }
}

// ============================================
// STAGE 4: SEMANTIC VALIDATOR
// ============================================

class SemanticValidator {
    validate(query, analysis) {
        const lower = query.toLowerCase().trim();
        const words = lower.split(/\s+/);

        if (words.length < 2) return { valid: false, reason: 'too_few_words' };
        if (words.length > 10) return { valid: false, reason: 'too_many_words' };

        if (this._hasReversedWordOrder(lower)) return { valid: false, reason: 'reversed_word_order' };
        if (this._hasForbiddenAction(lower, analysis)) return { valid: false, reason: 'forbidden_action' };
        if (this._hasInventedWords(lower)) return { valid: false, reason: 'invented_words' };
        if (this._isUnnaturalCombination(lower)) return { valid: false, reason: 'unnatural_combination' };
        if (this._hasNounPhraseError(lower)) return { valid: false, reason: 'noun_phrase_error' };
        if (this._isCommercialForFreeTool(lower, analysis)) return { valid: false, reason: 'commercial_for_free_tool' };
        if (this._hasCrossCategoryContamination(lower, analysis)) return { valid: false, reason: 'cross_category' };
        if (this._isTemplateSpam(lower)) return { valid: false, reason: 'template_spam' };

        return { valid: true };
    }

    _hasReversedWordOrder(lower) {
        const reversedPatterns = [
            /^(image|photo|picture|video|audio)\s+(compress|convert|remove|resize|edit|crop|optimize|upscale|enhance|download)\b/i,
            /^(tool|software|app|platform|online|free)\s+(compress|convert|remove|resize|edit|crop|optimize)\b/i,
            /^(keyword|seo|content|blog)\s+(research|planner|tool|generator|finder)\s+(keyword|seo|content|blog)\b/i
        ];
        for (const p of reversedPatterns) {
            if (p.test(lower)) return true;
        }
        return false;
    }

    _hasForbiddenAction(lower, analysis) {
        if (!analysis || !analysis.imageTool) return false;
        const tool = analysis.imageTool;
        if (!tool || !tool.category) return false;
        const profile = CONCEPT_PROFILES[tool.name];
        if (!profile) return false;
        for (const verb of profile.forbiddenVerbs) {
            const verbPattern = new RegExp('\\b' + verb + '\\b', 'i');
            if (verbPattern.test(lower)) {
                const toolWords = tool.name.split(/\s+/);
                const hasToolContext = toolWords.some(w => w.length > 3 && lower.indexOf(w) !== -1);
                if (!hasToolContext) return true;
            }
        }
        return false;
    }

    _hasInventedWords(lower) {
        const englishWords = new Set([
            'how', 'to', 'best', 'free', 'online', 'for', 'the', 'and', 'with',
            'what', 'is', 'are', 'does', 'can', 'use', 'find', 'get', 'make',
            'create', 'build', 'start', 'learn', 'try', 'try', 'top', 'tool',
            'guide', 'tutorial', 'tips', 'step', 'by', 'complete', 'from',
            'without', 'using', 'that', 'this', 'your', 'all', 'new', 'fast',
            'easy', 'quick', 'simple', 'good', 'great', 'perfect', 'ultimate',
            'beginners', 'professionals', 'developers', 'writers', 'students',
            'comparison', 'alternatives', 'vs', 'versus', 'review', 'checklist',
            'examples', 'workflow', 'practices', 'strategy', 'strategies',
            'in', 'on', 'at', 'of', 'for', 'to', 'into', 'through', 'via',
            'year', '2025', '2026', '2024', 'app', 'software', 'platform',
            'image', 'photo', 'picture', 'video', 'audio', 'text', 'code',
            'online', 'desktop', 'mobile', 'web', 'batch', 'bulk', 'auto',
            'lossless', 'lossy', 'format', 'quality', 'size', 'resolution',
            'transparent', 'white', 'background', 'watermark', 'logo', 'text',
            'crop', 'resize', 'compress', 'convert', 'optimize', 'upscale',
            'edit', 'enhance', 'remove', 'add', 'download', 'upload', 'share',
            'save', 'export', 'import', 'generate', 'check', 'validate',
            'format', 'minify', 'beautify', 'lint', 'debug', 'test',
            'encrypt', 'decrypt', 'encode', 'decode', 'hash', 'sign',
            'calculate', 'compute', 'measure', 'track', 'manage', 'plan',
            'schedule', 'automate', 'integrate', 'connect', 'sync'
        ]);
        const words = lower.split(/\s+/);
        for (const w of words) {
            if (w.length > 3 && !englishWords.has(w) && !/^\d+$/.test(w)) {
                if (!/^[a-z]+ing$/.test(w) && !/^[a-z]+ed$/.test(w) && !/^[a-z]+er$/.test(w) && !/^[a-z]+ly$/.test(w) && !/^[a-z]+tion$/.test(w) && !/^[a-z]+ment$/.test(w) && !/^[a-z]+ness$/.test(w)) {
                    const isKnownTool = /compressor|converter|resizer|editor|cropper|optimizer|upscaler|remover|enhancer|planner|generator|checker|tracker|manager|builder|maker|creator|assistant/i.test(w);
                    const isKnownDomain = /seo|ecommerce|wordpress|photoshop|figma|youtube|tiktok|instagram|github|docker|kubernetes/i.test(w);
                    if (!isKnownTool && !isKnownDomain) return true;
                }
            }
        }
        return false;
    }

    _isUnnaturalCombination(lower) {
        const unnatural = [
            /\b(compress|convert|resize|crop|optimize|upscale|remove)\s+(tool|software|app|platform|guide|tutorial|strategy|plan)\b/i,
            /\b(tool|software|app|platform)\s+(compress|convert|resize|crop|optimize|upscale|remove)\b/i,
            /\b(article|blog|post)\s+(seo|marketing|strategy|ranking|research)\b/i,
            /\b(keyword|keywords?)\s+(keyword|keywords?)\b/i,
            /\b(guide|tutorial)\s+(guide|tutorial)\b/i,
            /\b(best|top|free)\s+(best|top|free)\b/i,
            /\b(step|by|step)\s+(step|by|step)\b/i,
            /\b(beginner|beginners?)\s+(beginner|beginners?)\b/i,
            /\b(for|with|using)\s+(for|with|using)\b/i,
            /\b(strategy|strategies)\s+(strategy|strategies)\b/i,
            /\b(tips|tricks)\s+(tips|tricks)\b/i
        ];
        for (const p of unnatural) {
            if (p.test(lower)) return true;
        }
        return false;
    }

    _hasNounPhraseError(lower) {
        const nounPhraseErrors = [
            /^(free|best|top|great)\s+(compress|convert|resize|edit|crop|optimize|upscale|remove|enhance)\s+(image|photo|picture|video)$/i,
            /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize)\s+\w+$/i,
            /\b(analysis|research|basics|fundamentals|studies)\s+for\s+(workflow|analysis|research|basics|fundamentals|studies)\b/i,
            /\b(workflow|analysis|research)\s+for\s+(workflow|analysis|research)\b/i
        ];
        for (const p of nounPhraseErrors) {
            if (p.test(lower)) return true;
        }
        return false;
    }

    _isCommercialForFreeTool(lower, analysis) {
        if (!analysis || !analysis.imageTool) return false;
        const commercial = /\b(buy|purchase|order|price|pricing|cost|deal|discount|coupon|subscription|license|premium|pro version|enterprise)\b/i;
        const freeTool = /\b(free|open source|freeware)\b/i;
        if (commercial.test(lower) && freeTool.test(lower)) return true;
        return false;
    }

    _hasCrossCategoryContamination(lower, analysis) {
        if (!analysis) return false;
        const type = analysis.type;
        const categoryBans = {
            'image': /\b(subtitle|closed caption|srt|vtt|transcription|invoice|shipping|tax|payment|password|qr code|budget|cipher|json)\b/i,
            'video': /\b(image compression|background remover|photo editor|image converter|image resizer|image optimizer|watermark|image upscaler|image cropper)\b/i,
            'seo': /\b(image compression|background remover|photo editor|image converter|video editing|screen recorder|subtitle|cipher|json|budget)\b/i,
            'programming': /\b(image compression|background remover|photo editor|video editing|subtitle|invoice|budget|qr code)\b/i
        };
        if (categoryBans[type] && categoryBans[type].test(lower)) return true;
        return false;
    }

    _isTemplateSpam(lower) {
        const words = lower.split(/\s+/);
        const uniqueWords = new Set(words);
        if (uniqueWords.size < words.length * 0.5 && words.length > 3) return true;
        const repeated = words.filter((w, i) => words.indexOf(w) !== i);
        if (repeated.length > words.length * 0.4) return true;
        return false;
    }
}

// ============================================
// STAGE 5: GRAMMAR VALIDATOR
// ============================================

class GrammarValidator {
    validate(query) {
        if (!query || query.length < 8) return { valid: false, reason: 'too_short' };
        if (query.length > 80) return { valid: false, reason: 'too_long' };

        const words = query.split(/\s+/);
        if (words.length < 2) return { valid: false, reason: 'too_few_words' };
        if (words.length > 10) return { valid: false, reason: 'too_many_words' };

        const lower = query.toLowerCase();

        for (const pattern of UNSOUND_COMBINATIONS) {
            if (pattern.test(query)) return { valid: false, reason: 'unsound_combination' };
        }

        if (/\b(the|a|an)\s+(the|a|an)\b/.test(lower)) return { valid: false, reason: 'double_article' };

        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        if (uniqueWords.size < words.length * 0.6 && words.length > 3) {
            return { valid: false, reason: 'excessive_repetition' };
        }

        return { valid: true };
    }
}

// ============================================
// STAGE 5: SEMANTIC DEDUPLICATOR
// ============================================

class SemanticDeduplicator {
    deduplicate(queries) {
        const exactSeen = new Set();
        const exactFiltered = [];
        for (const q of queries) {
            const key = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
            if (!exactSeen.has(key)) {
                exactSeen.add(key);
                exactFiltered.push(q);
            }
        }

        const intentSeen = new Map();
        const result = [];

        for (const q of exactFiltered) {
            const intentKey = this._intentKey(q);
            const existing = intentSeen.get(intentKey);
            if (!existing) {
                intentSeen.set(intentKey, q);
                result.push(q);
            } else {
                if (q.split(/\s+/).length > existing.split(/\s+/).length) {
                    const idx = result.indexOf(existing);
                    if (idx !== -1) result[idx] = q;
                    intentSeen.set(intentKey, q);
                }
            }
        }

        return result;
    }

    _intentKey(query) {
        let norm = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();

        for (const group of SYNONYM_GROUPS) {
            for (const syn of group) {
                const re = new RegExp('\\b' + syn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
                if (re.test(norm)) {
                    norm = norm.replace(re, '%%SYN%%');
                    break;
                }
            }
        }

        const stripped = norm
            .replace(/\b(best|top|leading|free|online|tool|software|app|platform|guide|tutorial|how to|step by step|for beginners|tips|examples|checklist|comparison|alternatives|reviews|pricing|features|download|complete guide|for)\b/g, '')
            .replace(/%%SYN%%/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return stripped;
    }
}

// ============================================
// STAGE 6: QUALITY SCORER
// ============================================

class QualityScorer {
    score(query, analysis) {
        let s = 0;
        const words = query.split(/\s+/);
        const lower = query.toLowerCase();

        if (words.length >= 3 && words.length <= 7) s += 15;
        else if (words.length === 2) s += 5;
        else if (words.length > 8) s -= 10;

        if (/^(how to|what is|why use|when to|where to|which|best|top|free|complete guide to)\b/i.test(lower)) s += 20;

        if (/\b(how|what|why|where|when|which|does|can|is)\b/.test(lower)) s += 15;

        if (/\b(guide|tutorial|checklist|examples|tips|best practices|step by step|explained|pros and cons)\b/.test(lower)) s += 15;

        if (/\b(best|top|free|alternative|comparison|review|vs)\b/.test(lower)) s += 10;

        if (/\b(tool|software|app|platform|template|generator|checker)\b/.test(lower)) s += 5;

        if (/\b(SEO|AI|keyword|marketing|content|design|code|develop|build)\b/i.test(query)) s += 5;

        if (/\bfor (beginners|professionals|developers|marketers|teams|small businesses|startups|photographers|students|writers)\b/i.test(lower)) s += 10;

        if (/\b\d{4}\b/.test(query)) s += 5;

        if (/\b(without losing quality|without quality loss|lossless|batch|in bulk|step by step|from scratch)\b/i.test(lower)) s += 8;

        if (/\b(online|free|open source)\b/i.test(lower) && /\b(tool|software|app|editor|converter|compressor)\b/i.test(lower)) s += 5;

        if (/\b(how to|tutorial|guide|learn)\b/i.test(lower) && /\b(for beginners|step by step|from scratch|basics)\b/i.test(lower)) s += 10;

        if (analysis) {
            const topicLower = analysis.topic ? analysis.topic.toLowerCase() : '';
            if (topicLower && lower.indexOf(topicLower) !== -1) s += 12;
            if (analysis.imageTool) {
                const toolName = analysis.imageTool.name;
                if (toolName && lower.indexOf(toolName) !== -1) s += 15;
            }
        }

        const naturalPatterns = [
            /\b(how to|what is|best|free|online|for beginners|step by step|tutorial|guide|alternatives|comparison|without|with|in)\b/i,
            /\b(for|with|in|on|from|to|of|by)\b/i
        ];
        let naturalCount = 0;
        for (const p of naturalPatterns) {
            if (p.test(lower)) naturalCount++;
        }
        if (naturalCount >= 2) s += 10;
        if (naturalCount >= 3) s += 5;

        if (/\b(article|blog post)\s+(article|blog post)\b/i.test(query)) s -= 30;
        if (/\b(generate|compress|convert)\s+(tool|software|app|platform|strategy|guide)\b/i.test(query)) s -= 15;
        if (/\b(compress|convert|resize|crop|optimize|upscale|remove)\s+(article|blog|post|guide|tutorial|video|strategy|plan|tips|ideas|examples)\b/i.test(query)) s -= 20;
        if (/\b(article|blog|post|guide|tutorial|video|tool|software|app|platform|strategy|plan|tips|ideas|examples|checklist|templates)\s+(article|blog|post|guide|tutorial|video|tool|software|app|platform|strategy|plan|tips|ideas|examples|checklist|templates)\b/i.test(query)) s -= 25;
        if (/\b(keyword|keywords?)\s+(keyword|keywords?)\b/i.test(query)) s -= 30;
        if (/\b(guide|tutorial)\s+(guide|tutorial)\b/i.test(query)) s -= 25;
        if (/\b(best|top|free)\s+(best|top|free)\b/i.test(query)) s -= 25;
        if (/\b(step|by|step)\s+(step|by|step)\b/i.test(query)) s -= 25;
        if (/\b(beginner|beginners?)\s+(beginner|beginners?)\b/i.test(query)) s -= 25;
        if (/\b(for|with|using)\s+(for|with|using)\b/i.test(query)) s -= 25;

        return Math.max(0, Math.min(100, s));
    }

    filter(scored, threshold) {
        return scored.filter(item => item.score >= threshold);
    }
}

// ============================================
// STAGE 7: KEYWORD NORMALIZER
// ============================================

class KeywordNormalizer {
    constructor() {
        this._fixers = [
            {
                test: /^(beginner|professional|advanced|quick|fast|easy|simple|basic|expert|newbie|pro)\s+(generate|compress|convert|remove|resize|find|create|build|edit|optimize|learn|write|design|develop)\s+(\w+)$/i,
                fix(m) {
                    const mod = m[1].toLowerCase();
                    const verb = m[2].toLowerCase();
                    const obj = m[3].toLowerCase();
                    const plural = mod.endsWith('s') ? mod : mod + 's';
                    return verb.charAt(0).toUpperCase() + verb.slice(1) + ' ' + obj + ' for ' + plural;
                }
            },
            {
                test: /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|enhance|improve|write|design|develop)\s+(\w+)\s+(seo|content|blog|blogging|marketing|research|study|youtube|google|image|video|pdf|html|css|web|site|ecommerce|shop|social|ai|local|mobile|technical|organic|serp|audio|b2b|b2c)$/i,
                fix(m) {
                    const verb = m[1].toLowerCase();
                    const obj = m[2].toLowerCase();
                    const topic = m[3].toLowerCase();
                    const capped = topic.charAt(0).toUpperCase() + topic.slice(1);
                    return verb.charAt(0).toUpperCase() + verb.slice(1) + ' ' + capped + ' ' + obj;
                }
            },
            {
                test: /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|enhance|improve|write|design)\s+(\w+)\s+(\w+ing)$/i,
                fix(m) {
                    const verb = m[1].toLowerCase();
                    const obj = m[2].toLowerCase();
                    const gerund = m[3].toLowerCase();
                    return verb.charAt(0).toUpperCase() + verb.slice(1) + ' ' + obj + ' for ' + gerund;
                }
            },
            {
                test: /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|learn)\s+(\w+)\s+(\w+s)$/i,
                fix(m) {
                    const verb = m[1].toLowerCase();
                    const obj = m[2].toLowerCase();
                    const pluralTopic = m[3].toLowerCase();
                    return verb.charAt(0).toUpperCase() + verb.slice(1) + ' ' + obj + ' for ' + pluralTopic;
                }
            },
            {
                test: /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|enhance|improve|write|design|develop|learn)\s+(\w+)$/i,
                fix(m) {
                    const verb = m[1].toLowerCase();
                    const obj = m[2].toLowerCase();
                    return 'How to ' + verb + ' ' + obj;
                }
            },
            {
                test: /^(\w+)\s+(studies?|research|analysis|basics|fundamentals|tutorial|guide|tips|checklist|examples)\s+(\w+)$/i,
                fix(m) {
                    const topic = m[3].toLowerCase();
                    const suffix = m[2].toLowerCase();
                    const capped = topic.charAt(0).toUpperCase() + topic.slice(1);
                    return suffix.charAt(0).toUpperCase() + suffix.slice(1) + ' for ' + capped;
                }
            },
            {
                test: /^(best|top|free|great)\s+(compress|convert|resize|edit|crop|optimize|upscale|remove|enhance)\s+(image|photo|picture)$/i,
                fix(m) {
                    const adj = m[1].toLowerCase();
                    const verb = m[2].toLowerCase();
                    const noun = m[3].toLowerCase();
                    const tool = verb + (verb.endsWith('e') ? 'r' : 'er');
                    return adj.charAt(0).toUpperCase() + adj.slice(1) + ' ' + noun + ' ' + tool;
                }
            },
            {
                test: /^(how do i|how can i|how does)\s+(\w+)\s+(image|photo|picture)\s+(compressor|converter|resizer|editor|cropper|optimizer|upscaler|enhancer|remover)$/i,
                fix(m) {
                    const intro = m[1].toLowerCase();
                    const noun = m[3].toLowerCase();
                    const tool = m[4].toLowerCase();
                    if (intro === 'how does') return 'How does ' + noun + ' ' + tool + ' work';
                    return 'How to use ' + (intro === 'how can i' ? 'a ' : 'an ') + noun + ' ' + tool;
                }
            },
            {
                test: /^(beginner|beginners?)\s+(image|photo|picture)\s+(compressor|converter|resizer|editor|cropper|optimizer|upscaler|enhancer|remover)$/i,
                fix(m) {
                    const noun = m[2].toLowerCase();
                    const tool = m[3].toLowerCase();
                    return noun.charAt(0).toUpperCase() + noun.slice(1) + ' ' + tool + ' for beginners';
                }
            },
            {
                test: /^(free|best|top)\s+(image|photo|picture)\s+(size|editing|compressing|resizing|converting)$/i,
                fix(m) {
                    const adj = m[1].toLowerCase();
                    const noun = m[2].toLowerCase();
                    const gerund = m[3].toLowerCase().replace(/ing$/, '');
                    const tool = gerund + (gerund.endsWith('e') ? 'r' : 'er');
                    return adj.charAt(0).toUpperCase() + adj.slice(1) + ' ' + noun + ' ' + tool;
                }
            },
            {
                test: /^how\s+(does|to)\s+(image|photo|picture)\s+(compressor|converter|resizer|editor|cropper|optimizer|upscaler)$/i,
                fix(m) {
                    const noun = m[2].toLowerCase();
                    const tool = m[3].toLowerCase();
                    return 'How ' + m[1].toLowerCase() + ' ' + noun + ' ' + tool + ' work';
                }
            },
            {
                test: /^(which|what)\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)\s+(is best|best)$/i,
                fix(m) {
                    const key = m[2].toLowerCase() + ' ' + m[3].toLowerCase();
                    const tool = ABSTRACT_TO_TOOL[key] || key;
                    return 'Which ' + tool + ' is best';
                }
            },
            {
                test: /^how\s+(do|can)\s+i\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing)/i,
                fix(m) {
                    const key = m[3].toLowerCase() + ' ' + m[4].toLowerCase();
                    const tool = ABSTRACT_TO_TOOL[key] || key;
                    const action = CONCEPT_ACTION_MAP[tool] || tool;
                    return 'How to ' + action;
                }
            },
            {
                test: /^(beginner|beginners?)\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)$/i,
                fix(m) {
                    const key = m[2].toLowerCase() + ' ' + m[3].toLowerCase();
                    const tool = ABSTRACT_TO_TOOL[key] || key;
                    return tool.charAt(0).toUpperCase() + tool.slice(1) + ' for beginners';
                }
            },
            {
                test: /^(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)\s+(content|comparison)$/i,
                fix(m) {
                    const key = m[1].toLowerCase() + ' ' + m[2].toLowerCase();
                    const tool = ABSTRACT_TO_TOOL[key] || key;
                    return tool.charAt(0).toUpperCase() + tool.slice(1);
                }
            }
        ];

        this._naturalIndicators = [
            /\b(for|with|using|in|from|to|about|of|by|into|through|via|at)\b/i,
            /^(how |what |why |where |when |which |best |top |free |can |what are )/i,
            /\bvs\b/i,
            /\b\d{4}\b/,
            /\bfor (beginners|professionals|developers|marketers|teams|small businesses|startups|ecommerce)\b/i,
            /^(complete |ultimate |essential |step by |everything )/i,
            /\b(guide|tutorial|checklist|examples|best practices|alternatives|comparison|step by step)\b/i,
            /\b(and|or|vs)\b/i,
            /^(what are |how to |complete |ultimate |essential |everything )/i
        ];

        this._weakPatterns = [
            /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|enhance|improve|write|design|develop|learn)\s+\w+$/i,
            /^\w+\s+(studies?|research|analysis|basics|fundamentals|tutorial|guide|tips|checklist|examples)\s+\w+$/i,
            /^(\w+\s+){0,2}(study|studies|research|analysis|fundamentals|basics|beginners?)\s+\w+\s+(study|studies|research|analysis|fundamentals|basics|beginners?)$/i,
            /^free\s+(image|photo|picture)\s+(size|quality|type|format|file)$/i,
            /^beginner\s+(image|photo|picture)\s+(compress|convert|resize|edit|crop|optimi)/i,
            /^(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing)\s+(content|comparison|guide|tutorial|basics|fundamentals|tips|examples|checklist|workflow|ideas)\s*$/i,
            /^(which|what)\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)\s+(is best|best)\s*$/i
        ];

        this._meaninglessPhrases = [
            /analysis for workflow/i,
            /workflow for analysis/i,
            /basics for beginners/i,
            /tutorial for guide/i,
            /guide for tutorial/i,
            /tips for beginners guide/i,
            /checklist for examples/i,
            /ideas for tips/i,
            /image (size|type|format) (guide|tutorial|checklist|tips|examples)/i,
            /(guide|tutorial|checklist|tips) for (image|photo)\s+(size|type|format|editing|compressing)/i,
            /(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing)\s+(content|comparison|ideas)\s*$/i
        ];
    }

    normalize(keywords) {
        const result = [];
        const replacements = [];

        for (const kw of keywords) {
            if (this._passesFinalFilter(kw) && this._isNatural(kw) && this._googleNaturalCheck(kw)) {
                result.push(kw);
            } else {
                const fixed = this._rewrite(kw);
                if (fixed && this._passesFinalFilter(fixed) && this._googleNaturalCheck(fixed)) {
                    if (!this._alreadyExists(result, fixed) && !this._alreadyExists(replacements, fixed)) {
                        replacements.push(fixed);
                    }
                }
            }
        }

        const deduped = [];
        const seen = new Set();
        const allCandidates = result.concat(replacements);
        for (const kw of allCandidates) {
            const key = kw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(kw);
            }
        }

        return deduped;
    }

    _passesFinalFilter(kw) {
        const lower = kw.toLowerCase().trim();
        if (lower.length < 10) return false;
        const words = lower.split(/\s+/);
        if (words.length < 2) return false;

        for (const weak of this._weakPatterns) {
            if (weak.test(kw)) return false;
        }

        for (const phrase of this._meaninglessPhrases) {
            if (phrase.test(kw)) return false;
        }

        return true;
    }

    _googleNaturalCheck(kw) {
        const lower = kw.toLowerCase().trim();

        const badNounEndings = /\b(study|studies|research|analysis)(\s+\w+)?$/i;
        if (badNounEndings.test(lower)) return false;

        const wordCount = lower.split(/\s+/).length;

        const junkWords = ['blogging', 'workflow', 'analysis for', 'for workflow'];
        for (const junk of junkWords) {
            if (lower.includes(junk)) return false;
        }

        const abstractNounPattern = /^(which|what|how|where|when)\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)\b/i;
        if (abstractNounPattern.test(lower) && !/\b(compressor|converter|resizer|editor|cropper|optimizer|upscaler|remover|eraser|enhancer)\b/i.test(lower)) {
            if (!/remov(e|ing)|compress(ed|ing)|convert(ed|ing)|resize|edit|crop|upscale|optimiz(e|ing)/i.test(lower)) return false;
        }

        const hasActionVerb = /^(generate|compress|convert|remove|resize|find|create|build|edit|optimize|enhance|improve|write|design|develop|learn)\s+/i;
        const hasPreposition = /\b(for|with|without|using|through|via|in|on|by|to|from|at|of)\b/i;
        const hasQuestionWord = /\b(how|what|why|when|where|which|can|could|should|would)\b/i;

        const verbMatch = lower.match(hasActionVerb);
        if (verbMatch && !hasPreposition.test(lower) && !hasQuestionWord.test(lower) && wordCount < 4) {
            return false;
        }

        const badOrder = /^(best|top|free)\s+(compress|convert|resize|edit|crop|optimize|upscale|remove|enhance)\s+/i;
        if (badOrder.test(lower) && wordCount < 4) return false;

        const howDoI = /^how\s+(do|can|does)\s+i\s+\w+\s+/i;
        if (howDoI.test(lower) && wordCount < 5) return false;

        const beginnerAbstract = /^beginner\s+(background|image|photo)\s+(removal|compression|conversion|editing|cropping|upscaling|optimization|resizing|format)/i;
        if (beginnerAbstract.test(lower)) return false;

        const beginnerNoun = /^beginner\s+(image|photo|picture)\s+/i;
        if (beginnerNoun.test(lower) && wordCount < 4) return false;

        const freeIncomplete = /^free\s+(image|photo|picture)\s+(size|quality|type|format|file)\s*$/i;
        if (freeIncomplete.test(lower)) return false;

        const badRepeats = [
            /\bfor\s+(beginners?|dummies)\s+(beginners?|dummies)\b/i,
            /\b(beginners?|dummies)\s+(guide|tutorial)\s+(beginners?|dummies)\b/i,
        ];
        for (const br of badRepeats) {
            if (br.test(lower)) return false;
        }

        return true;
    }

    _isNatural(kw) {
        const lower = kw.toLowerCase();
        if (lower.length < 10) return false;

        let naturalScore = 0;

        if (/^(how to|what is|what are|why use|when to|where to|which|best|top|free|can|complete guide to|how do|how does|how can)\b/i.test(lower)) naturalScore += 3;

        if (/\b(for|with|using|in|from|to|about|of|by|into|through|via|at|without|on)\b/i.test(lower)) naturalScore += 2;

        if (/\b(guide|tutorial|checklist|examples|tips|best practices|alternatives|comparison|step by step|workflow|explained|pros and cons)\b/i.test(lower)) naturalScore += 2;

        if (/\b(for beginners|for professionals|for developers|for marketers|for teams|for small businesses|for startups|for photographers|for students|for writers)\b/i.test(lower)) naturalScore += 2;

        if (/\b(online|free|open source|without losing quality|in bulk|batch)\b/i.test(lower)) naturalScore += 1;

        if (/\b(and|or|vs|versus)\b/i.test(lower)) naturalScore += 1;

        if (/\b\d{4}\b/.test(lower)) naturalScore += 1;

        if (/\b(tool|software|app|platform|editor|converter|compressor|generator|checker|manager|planner)\b/i.test(lower)) naturalScore += 1;

        const words = lower.split(/\s+/);
        const uniqueWords = new Set(words);
        if (uniqueWords.size === words.length && words.length >= 3) naturalScore += 1;

        if (/^[a-z]/.test(lower) && !/^\w+\s+\w+\s+\w+$/.test(lower)) naturalScore += 1;

        if (naturalScore >= 4) return true;

        if (this._detectPattern(kw) !== null) return false;

        return naturalScore >= 2;
    }

    _detectPattern(kw) {
        for (const fixer of this._fixers) {
            const match = kw.match(fixer.test);
            if (match) return match;
        }
        return null;
    }

    _rewrite(kw) {
        const match = this._detectPattern(kw);
        if (!match) return null;
        for (const fixer of this._fixers) {
            const m = kw.match(fixer.test);
            if (m) {
                try {
                    const fixed = fixer.fix(m);
                    if (fixed && fixed !== kw && fixed.length >= 10) {
                        return fixed;
                    }
                } catch { }
            }
        }
        return null;
    }

    _alreadyExists(arr, kw) {
        const normalized = kw.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
        return arr.some(existing =>
            existing.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() === normalized
        );
    }
}

// ============================================
// KEYWORD GENERATION PIPELINE
// ============================================

class KeywordGenerationPipeline {
    constructor() {
        this.analyzer = new TopicAnalyzer();
        this.expander = new ConceptExpander();
        this.scopeFilter = new TopicScopeFilter();
        this.builder = new QueryBuilder();
        this.semanticValidator = new SemanticValidator();
        this.grammarValidator = new GrammarValidator();
        this.deduplicator = new SemanticDeduplicator();
        this.scorer = new QualityScorer();
        this.normalizer = new KeywordNormalizer();
    }

    generate(topic) {
        const analysis = this.analyzer.analyze(topic);
        const concepts = this.expander.expand(analysis);
        const filteredConcepts = this.scopeFilter.filterConcepts(concepts, analysis);
        const rawQueries = this.builder.build(filteredConcepts, analysis);

        const validQueries = rawQueries.filter(q => {
            const semResult = this.semanticValidator.validate(q, analysis);
            if (!semResult.valid) return false;
            const gramResult = this.grammarValidator.validate(q);
            return gramResult.valid;
        });

        const unique = this.deduplicator.deduplicate(validQueries);
        const scored = unique.map(q => ({ query: q, score: this.scorer.score(q, analysis) }));
        const filtered = this.scorer.filter(scored, 25);
        filtered.sort((a, b) => b.score - a.score);
        const pipelineResults = filtered.map(item => item.query);
        const scopedResults = this.scopeFilter.filterKeywords(pipelineResults, analysis);
        return this.normalizer.normalize(scopedResults);
    }
}

// ============================================
// SMART KEYWORD GENERATOR
// ============================================

class SmartKeywordGenerator {
    constructor() {
        this.templateEngine = new TemplateEngine();
        this.pipeline = new KeywordGenerationPipeline();
        this.scopeFilter = new TopicScopeFilter();
        this.generatedKeywords = new Map();
        this.statistics = null;
        this.categoriesUsed = new Set();
        this.keywordCache = new Map();
        this.normalizer = new KeywordNormalizer();
    }

    _resolveToSearchTerms(topic) {
        const lower = topic.toLowerCase().trim();
        if (TOOL_SEARCH_TERMS[lower]) {
            return { resolved: true, primary: TOOL_SEARCH_TERMS[lower][0], terms: TOOL_SEARCH_TERMS[lower] };
        }
        return { resolved: false, primary: topic, terms: [topic] };
    }

    _normalizeAndAdd(map, kw, analysis) {
        const normalized = this.normalizer.normalize([kw]);
        if (normalized.length > 0) {
            if (analysis) {
                const filtered = this.scopeFilter.filterKeywords(normalized, analysis);
                if (filtered.length > 0) this._addIfValid(map, filtered[0]);
            } else {
                this._addIfValid(map, normalized[0]);
            }
        }
    }

    generate(topic, options = {}) {
        const startTime = performance.now();
        const {
            categories = ['exact', 'long-tail', 'questions', 'modifiers'],
            maxKeywords = CONFIG.maxKeywords
        } = options;

        const keywordMap = new Map();
        const resolved = this._resolveToSearchTerms(topic);
        const searchTerms = resolved.terms;
        const primaryTerm = resolved.primary;

        const topicType = Utils.detectKeywordType(primaryTerm);
        const analysis = new TopicAnalyzer().analyze(primaryTerm);

        const pipelineKeywords = this.pipeline.generate(primaryTerm);
        pipelineKeywords.forEach(kw => this._addIfValid(keywordMap, kw));

        for (const term of searchTerms) {
            const termAnalysis = new TopicAnalyzer().analyze(term);
            const termKeywords = this.pipeline.generate(term);
            termKeywords.forEach(kw => this._addIfValid(keywordMap, kw));
        }

        if (categories.includes('exact')) {
            for (const term of searchTerms) {
                this._addIfValid(keywordMap, term);
            }
        }

        if (categories.includes('long-tail') || categories.includes('modifiers')) {
            for (const term of searchTerms) {
                const termType = Utils.detectKeywordType(term);
                const termAnalysis = new TopicAnalyzer().analyze(term);
                const relevantCategories = this.templateEngine.getRelevantTemplates(termType);
                const selectedCategories = categories.includes('modifiers')
                    ? relevantCategories
                    : relevantCategories.filter(c =>
                        ['informational', 'tutorials', 'beginner', 'questions', 'content'].indexOf(c) !== -1
                    );

                const allTemplates = this.templateEngine.templates;
                const templatesToUse = [];
                selectedCategories.forEach(cat => {
                    if (allTemplates[cat]) templatesToUse.push(allTemplates[cat]);
                });

                templatesToUse.forEach(templateGroup => {
                    const budget = Math.min(2, Math.ceil(maxKeywords / (templatesToUse.length * 5)));
                    let count = 0;
                    templateGroup.templates.forEach(template => {
                        if (count >= budget) return;
                        const kw = this.templateEngine.generateFromTemplate(template, term);
                        if (this._passesGrammarCheck(kw)) {
                            this._normalizeAndAdd(keywordMap, kw, termAnalysis);
                            count++;
                        }
                    });
                });
            }
        }

        if (categories.includes('questions')) {
            for (const term of searchTerms) {
                const q = this.templateEngine.getTemplatesByCategory('questions');
                if (q) q.templates.forEach(t => {
                    const kw = this.templateEngine.generateFromTemplate(t, term);
                    if (this._passesGrammarCheck(kw)) this._normalizeAndAdd(keywordMap, kw, analysis);
                });
            }
        }

        const scored = [...keywordMap.values()].map(kw => ({
            kw,
            score: this._finalScore(kw, topicType, analysis)
        }));
        scored.sort((a, b) => b.score - a.score);
        const finalKeywords = scored.slice(0, maxKeywords).map(s => s.kw);

        const endTime = performance.now();
        this.statistics = {
            totalGenerated: finalKeywords.length,
            duplicatesRemoved: keywordMap.size - finalKeywords.length,
            categoriesUsed: Array.from(this.categoriesUsed),
            generationTime: endTime - startTime,
            averageKeywordLength: finalKeywords.length > 0
                ? finalKeywords.reduce((sum, kw) => sum + kw.length, 0) / finalKeywords.length : 0,
            averageWordsPerKeyword: finalKeywords.length > 0
                ? finalKeywords.reduce((sum, kw) => sum + kw.split(' ').length, 0) / finalKeywords.length : 0,
            topicType: topicType
        };

        this.generatedKeywords.set(topic, finalKeywords);
        return finalKeywords;
    }

    _addIfValid(dict, keyword) {
        const normalized = Utils.normalizeKeyword(keyword);
        if (!normalized) return;
        const key = normalized.toLowerCase();
        if (dict.has(key)) return;
        const words = normalized.split(/\s+/);
        if (words.length < 2 || words.length > CONFIG.quality.maxWords) return;
        if (normalized.length < CONFIG.quality.minKeywordLength || normalized.length > CONFIG.quality.maxKeywordLength) return;
        dict.set(key, keyword);
    }

    _passesGrammarCheck(kw) {
        const validator = new GrammarValidator();
        return validator.validate(kw).valid;
    }

    _finalScore(kw, topicType, analysis) {
        const scorer = new QualityScorer();
        let s = scorer.score(kw, analysis);

        const lower = kw.toLowerCase();
        if (lower.indexOf(topicType) !== -1) s += 5;

        const words = kw.split(/\s+/);
        if (words.length >= 4 && words.length <= 6) s += 5;

        return s;
    }

    sortByIntent(keywords) {
        return keywords.sort((a, b) => this.calculateQualityScore(b) - this.calculateQualityScore(a));
    }

    calculateQualityScore(keyword) {
        const analysis = new TopicAnalyzer().analyze(keyword);
        return new QualityScorer().score(keyword, analysis);
    }

    getStatistics() { return this.statistics; }
    getKeywordsForTopic(topic) { return this.generatedKeywords.get(topic) || []; }
    clearCache() {
        this.generatedKeywords.clear();
        this.statistics = null;
        this.categoriesUsed.clear();
        this.keywordCache.clear();
    }
}

// ============================================
// KEYWORD GENERATOR APP (Main Controller)
// ============================================
class KeywordGeneratorApp {
    constructor() {
        this.generator = new SmartKeywordGenerator();
        this.currentKeywords = [];
        this.currentFilteredKeywords = [];
        this.currentTopic = '';
        this.statistics = null;
        this.favorites = this._loadFavorites();
        this.sortOrder = 'default';

        this.initializeUI();
        this.initializeEventListeners();
        this.initializeFAQ();
        this.focusInput();
    }

    initializeUI() {
        this.elements = {
            topicInput: document.getElementById('topic-input'),
            generateBtn: document.getElementById('generate-btn'),
            resetBtn: document.getElementById('reset-btn'),
            resultPlaceholder: document.getElementById('result-placeholder'),
            resultCard: document.getElementById('result-card'),
            keywordsList: document.getElementById('keywords-list'),
            copyAllBtn: document.getElementById('copy-all-btn'),
            clearResultsBtn: document.getElementById('clear-results-btn'),
            keywordCountBadge: document.getElementById('keyword-count-badge'),
            searchInput: document.getElementById('kw-search-input'),
            sortSelect: document.getElementById('kw-sort-select'),
            statTotal: document.getElementById('kw-stat-total'),
            statFavorites: document.getElementById('kw-stat-favorites'),
            statAvgLength: document.getElementById('kw-stat-avg-length'),
            statWords: document.getElementById('kw-stat-words'),
            statTopScore: document.getElementById('kw-stat-top-score'),
            statsBar: document.getElementById('kw-stats-bar')
        };

        this.notificationElement = null;
        this.notificationTimeout = null;
        this.copyTimeout = null;
    }

    initializeEventListeners() {
        this.elements.generateBtn.addEventListener('click', () => this.generateKeywords());
        this.elements.resetBtn.addEventListener('click', () => this.resetTool());
        this.elements.clearResultsBtn.addEventListener('click', () => this.resetTool());
        this.elements.copyAllBtn.addEventListener('click', () => this.copyAllKeywords());

        this.elements.topicInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.generateKeywords();
            }
        });

        if (this.elements.searchInput) {
            this.elements.searchInput.addEventListener('input', () => this._filterAndSort());
        }

        if (this.elements.sortSelect) {
            this.elements.sortSelect.addEventListener('change', () => {
                this.sortOrder = this.elements.sortSelect.value;
                this._filterAndSort();
            });
        }

        document.getElementById('kw-export-txt').addEventListener('click', () => this.exportKeywords('txt'));
        document.getElementById('kw-export-csv').addEventListener('click', () => this.exportKeywords('csv'));
        document.getElementById('kw-export-json').addEventListener('click', () => this.exportKeywords('json'));
        document.getElementById('kw-export-md').addEventListener('click', () => this.exportKeywords('md'));
    }

    initializeFAQ() {
        document.querySelectorAll('.faq-q').forEach(btn => {
            btn.addEventListener('click', function() {
                this.parentElement.classList.toggle('open');
            });
        });
    }

    focusInput() {
        if (this.elements.topicInput) this.elements.topicInput.focus();
    }

    showNotification(message, isError = false) {
        if (this.notificationElement) {
            this.notificationElement.remove();
            clearTimeout(this.notificationTimeout);
        }

        this.notificationElement = document.createElement('div');
        this.notificationElement.className = `notification${isError ? ' error' : ''}`;
        this.notificationElement.textContent = message;
        document.body.appendChild(this.notificationElement);

        this.notificationTimeout = setTimeout(() => {
            if (this.notificationElement) {
                this.notificationElement.remove();
                this.notificationElement = null;
                this.notificationTimeout = null;
            }
        }, CONFIG.notificationDuration);
    }

    generateKeywords() {
        const topic = this.elements.topicInput.value.trim();

        if (!topic) {
            this.showNotification('Please enter a topic', true);
            this.focusInput();
            return;
        }

        this.setLoading(true);
        this.currentTopic = topic;

        setTimeout(() => {
            try {
                const categories = this.getSelectedCategories();
                if (categories.length === 0) {
                    this.showNotification('Please select at least one keyword type', true);
                    this.setLoading(false);
                    return;
                }

                const keywords = this.generator.generate(topic, { categories });
                this.currentKeywords = keywords;
                this.statistics = this.generator.getStatistics();

                if (this.elements.searchInput) this.elements.searchInput.value = '';
                if (this.elements.sortSelect) this.elements.sortSelect.value = 'default';
                this.sortOrder = 'default';

                this._filterAndSort();
                this._showResults();
                this.showNotification(`Generated ${keywords.length} high-quality keywords`);
            } catch (error) {
                console.error('Generation error:', error);
                this.showNotification('An error occurred during generation', true);
            } finally {
                this.setLoading(false);
            }
        }, 10);
    }

    getSelectedCategories() {
        const checkboxes = document.querySelectorAll(
            'input[name="exact"], input[name="long-tail"], input[name="questions"], input[name="modifiers"]'
        );
        const selected = [];
        checkboxes.forEach(cb => {
            if (cb.checked) selected.push(cb.name);
        });
        return selected;
    }

    setLoading(loading) {
        const btn = this.elements.generateBtn;
        if (loading) {
            btn.textContent = 'Generating...';
            btn.disabled = true;
        } else {
            btn.textContent = 'Generate Keywords';
            btn.disabled = false;
        }
    }

    // ---- FILTER & SORT ----

    _filterAndSort() {
        let keywords = this.currentKeywords;
        const query = this.elements.searchInput ? this.elements.searchInput.value.trim().toLowerCase() : '';
        const sort = this.sortOrder;

        if (query) {
            keywords = keywords.filter(kw => kw.toLowerCase().indexOf(query) !== -1);
        }

        if (sort === 'length') {
            keywords = [...keywords].sort((a, b) => a.length - b.length);
        } else if (sort === 'alpha') {
            keywords = [...keywords].sort((a, b) => a.localeCompare(b));
        } else if (sort === 'score') {
            keywords = [...keywords].sort((a, b) => {
                return this.generator.calculateQualityScore(b) - this.generator.calculateQualityScore(a);
            });
        }

        this.currentFilteredKeywords = keywords;
        this._render();
        this._updateStats();
    }

    // ---- RENDER ----

    _render() {
        const list = this.elements.keywordsList;
        list.innerHTML = '';

        if (!this.currentFilteredKeywords.length) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:#94a3b8;font-size:13px;">No keywords match your search.</div>';
            return;
        }

        const fragment = document.createDocumentFragment();

        this.currentFilteredKeywords.forEach(kw => {
            const chip = document.createElement('div');
            chip.className = 'kw-chip';
            const isFav = this.favorites.has(kw);
            if (isFav) chip.classList.add('favorited');

            // Stars
            const score = this.generator.calculateQualityScore(kw);
            const starCount = score >= 70 ? 3 : score >= 40 ? 2 : score >= 15 ? 1 : 0;
            const starsEl = document.createElement('span');
            starsEl.className = 'kw-stars';
            starsEl.textContent = '\u2605'.repeat(starCount) + '\u2606'.repeat(3 - starCount);

            // Text
            const textEl = document.createElement('span');
            textEl.className = 'kw-text';
            textEl.textContent = kw;

            // Fav button
            const favBtn = document.createElement('button');
            favBtn.className = 'kw-fav-btn';
            favBtn.type = 'button';
            favBtn.textContent = isFav ? '\u2764' : '\u2661';
            favBtn.setAttribute('aria-label', isFav ? 'Remove from favorites' : 'Add to favorites');
            favBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._toggleFavorite(kw);
            });

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'kw-copy-btn';
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', async () => {
                try {
                    await Utils.copyText(kw);
                    copyBtn.textContent = 'Copied!';
                    clearTimeout(this.copyTimeout);
                    this.copyTimeout = setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, CONFIG.copyTimeout);
                } catch (error) {
                    this.showNotification('Could not copy to clipboard', true);
                }
            });

            chip.appendChild(starsEl);
            chip.appendChild(textEl);
            chip.appendChild(favBtn);
            chip.appendChild(copyBtn);
            fragment.appendChild(chip);
        });

        list.appendChild(fragment);
    }

    _showResults() {
        const placeholder = this.elements.resultPlaceholder;
        const card = this.elements.resultCard;
        const badge = this.elements.keywordCountBadge;

        placeholder.style.display = 'none';
        card.classList.add('show');
        badge.textContent = `${this.currentKeywords.length} keywords`;

        card.scrollIntoView({
            behavior: CONFIG.ui.scrollBehavior,
            block: CONFIG.ui.block
        });
    }

    // ---- STATS ----

    _updateStats() {
        if (!this.elements.statsBar) return;
        const total = this.currentFilteredKeywords.length;
        const totalAll = this.currentKeywords.length;
        const favCount = this.favorites.size;
        const avgLen = totalAll > 0
            ? Math.round(this.currentKeywords.reduce((s, k) => s + k.length, 0) / totalAll)
            : 0;
        const avgWords = totalAll > 0
            ? Math.round(this.currentKeywords.reduce((s, k) => s + k.split(/\s+/).length, 0) / totalAll * 10) / 10
            : 0;
        const topScore = totalAll > 0
            ? Math.max(...this.currentKeywords.map(k => this.generator.calculateQualityScore(k)))
            : 0;

        this.elements.statTotal.textContent = total < totalAll ? `${total}/${totalAll}` : `${totalAll}`;
        this.elements.statFavorites.textContent = favCount;
        this.elements.statAvgLength.textContent = avgLen;
        this.elements.statWords.textContent = avgWords;
        this.elements.statTopScore.textContent = topScore;
    }

    // ---- FAVORITES ----

    _loadFavorites() {
        try {
            const stored = localStorage.getItem('kw_favorites');
            return new Set(stored ? JSON.parse(stored) : []);
        } catch { return new Set(); }
    }

    _saveFavorites() {
        try {
            localStorage.setItem('kw_favorites', JSON.stringify([...this.favorites]));
        } catch { /* ignore */ }
    }

    _toggleFavorite(keyword) {
        if (this.favorites.has(keyword)) {
            this.favorites.delete(keyword);
        } else {
            this.favorites.add(keyword);
        }
        this._saveFavorites();

        // Re-render current view
        this._render();
        this._updateStats();
    }

    // ---- COPY ALL ----

    async copyAllKeywords() {
        if (!this.currentKeywords.length) {
            this.showNotification('No keywords to copy', true);
            return;
        }

        try {
            const text = this.currentFilteredKeywords.join('\n');
            await Utils.copyText(text);
            this.showNotification(`${this.currentFilteredKeywords.length} keywords copied to clipboard`);

            const btn = this.elements.copyAllBtn;
            btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
            clearTimeout(this.copyTimeout);
            this.copyTimeout = setTimeout(() => {
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copy All';
            }, CONFIG.copyTimeout);

        } catch (error) {
            this.showNotification('Failed to copy', true);
        }
    }

    // ---- RESET ----

    resetTool() {
        this.elements.topicInput.value = '';
        this.elements.keywordsList.innerHTML = '';
        this.elements.resultPlaceholder.style.display = '';
        this.elements.resultCard.classList.remove('show');
        this.elements.keywordCountBadge.textContent = '0 keywords';
        this.currentKeywords = [];
        this.currentFilteredKeywords = [];
        this.currentTopic = '';
        this.generator.clearCache();

        if (this.elements.searchInput) this.elements.searchInput.value = '';
        if (this.elements.sortSelect) this.elements.sortSelect.value = 'default';
        this.sortOrder = 'default';

        this.focusInput();

        if (this.notificationElement) {
            this.notificationElement.remove();
            this.notificationElement = null;
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }
    }

    // ---- EXPORT ----

    exportKeywords(format) {
        const keywords = this.currentFilteredKeywords;
        if (!keywords.length) {
            this.showNotification('No keywords to export', true);
            return;
        }

        try {
            let content, mimeType, extension;

            switch (format) {
                case 'txt':
                    content = keywords.join('\n');
                    mimeType = 'text/plain';
                    extension = 'txt';
                    break;

                case 'csv':
                    content = 'Keyword\n' + keywords.map(k => {
                        const escaped = k.indexOf(',') !== -1 || k.indexOf('"') !== -1 ? '"' + k.replace(/"/g, '""') + '"' : k;
                        return escaped;
                    }).join('\n');
                    mimeType = 'text/csv';
                    extension = 'csv';
                    break;

                case 'json': {
                    const data = keywords.map(k => ({
                        keyword: k,
                        score: this.generator.calculateQualityScore(k),
                        length: k.length,
                        words: k.split(/\s+/).length
                    }));
                    content = JSON.stringify(data, null, 2);
                    mimeType = 'application/json';
                    extension = 'json';
                    break;
                }

                case 'md':
                    content = '# Keywords: ' + this.currentTopic + '\n\n' +
                        '| # | Keyword | Score | Length | Words |\n' +
                        '|---|--------|-------|--------|-------|\n' +
                        keywords.map((k, i) => {
                            const score = this.generator.calculateQualityScore(k);
                            return `| ${i + 1} | ${k} | ${score} | ${k.length} | ${k.split(/\s+/).length} |`;
                        }).join('\n') +
                        '\n\n_Generated by GoToolly Keyword Generator_';
                    mimeType = 'text/markdown';
                    extension = 'md';
                    break;

                default:
                    this.showNotification('Unsupported format: ' + format, true);
                    return;
            }

            Utils.downloadFile(content, `keywords-${this.currentTopic.replace(/[^a-z0-9]/gi, '-').toLowerCase() || 'export'}.${extension}`, mimeType);
            this.showNotification(`Exported ${keywords.length} keywords as ${format.toUpperCase()}`);
        } catch (error) {
            this.showNotification('Export failed: ' + error.message, true);
        }
    }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    if (window.__keywordApp) {
        console.warn('Keyword Generator already initialized');
        return;
    }

    try {
        const app = new KeywordGeneratorApp();
        window.__keywordApp = app;

        window.exportKeywords = function(format) {
            if (window.__keywordApp) {
                window.__keywordApp.exportKeywords(format);
            }
        };

        console.log('Keyword Generator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize Keyword Generator:', error);

        const notification = document.createElement('div');
        notification.className = 'notification error';
        notification.textContent = 'Failed to initialize tool. Please refresh the page.';
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }
});