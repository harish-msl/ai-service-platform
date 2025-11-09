# 🧠 Training Open-Source LLMs for Project-Specific Accuracy

**Date:** November 8, 2025  
**Platform:** AI-as-a-Service Platform  
**Current Model:** Qwen2.5:1.5b (Ollama)  
**Goal:** Improve accuracy for specific project contexts

---

## 📊 Current Situation Analysis

### What We Have Now:
- ✅ Generic pre-trained LLM (Qwen2.5:1.5b)
- ✅ Schema injection via system prompts
- ✅ Conversation history for context
- ✅ Database schema discovery
- ⚠️ **Problem:** Model doesn't "learn" from project-specific patterns
- ⚠️ **Problem:** Generic responses, not domain-specific
- ⚠️ **Problem:** No memory of user preferences per project

---

## 🎯 Training Strategies (Ranked by Effort vs Impact)

### Strategy 1: **RAG (Retrieval-Augmented Generation)** ⭐⭐⭐⭐⭐
**Best for immediate implementation**

#### How It Works:
```
User Query → Search Similar Past Q&A → Inject into Context → LLM Response
```

#### Implementation Plan:
1. **Store Historical Interactions**
   - Save all successful Q&A pairs per project
   - Store user corrections/feedback
   - Track which SQL queries were executed successfully

2. **Vector Database Integration** (Weaviate - already available!)
   - Embed questions and answers
   - Retrieve top-k similar conversations
   - Inject into system prompt as "examples"

3. **Schema Evolution Tracking**
   - Version control for database schemas
   - Track schema changes over time
   - Update embeddings when schema changes

#### Code Example:
```typescript
// In chatbot.service.ts

async buildRAGContext(project: Project, query: string): Promise<string> {
  // 1. Search similar past conversations
  const similarConvos = await this.weaviateService.searchSimilar(
    project.id,
    query,
    limit: 5
  );

  // 2. Build examples from successful interactions
  const examples = similarConvos.map(conv => `
Q: ${conv.question}
A: ${conv.answer}
SQL: ${conv.sqlQuery}
Result: ${conv.successful ? 'Success' : 'Failed'}
  `).join('\n\n');

  return `
PAST SUCCESSFUL INTERACTIONS FOR THIS PROJECT:
${examples}

Use these examples to understand how to answer similar questions.
  `;
}
```

#### Pros:
- ✅ No model retraining needed
- ✅ Works with any LLM
- ✅ Immediate improvements
- ✅ Easy to implement (Weaviate already set up)
- ✅ Dynamic - learns from every interaction

#### Cons:
- ⚠️ Depends on quality of stored examples
- ⚠️ Token limit constraints
- ⚠️ Requires good embedding model

#### Effort: **Low** (1-2 weeks)
#### Impact: **High** (40-60% accuracy improvement)

---

### Strategy 2: **Few-Shot Learning with Curated Examples** ⭐⭐⭐⭐
**Medium effort, high impact**

#### How It Works:
Create a curated library of domain-specific examples per project type.

#### Implementation:
```typescript
interface ProjectTemplate {
  domain: 'survey' | 'ecommerce' | 'crm' | 'analytics';
  examples: Array<{
    question: string;
    context: string;
    idealResponse: string;
    sqlQuery: string;
  }>;
}

const SURVEY_DOMAIN_EXAMPLES = [
  {
    question: "Show me approval rates by month",
    context: "reports table with status column",
    idealResponse: "I'll create a line chart showing approval percentages...",
    sqlQuery: "SELECT MONTH(created_at) as month, SUM(CASE WHEN status='Approved' THEN 1 ELSE 0 END)*100.0/COUNT(*) as approval_rate FROM reports GROUP BY MONTH(created_at)"
  },
  // ... more examples
];

// Inject based on project domain
async getProjectTemplateExamples(project: Project): Promise<string> {
  const domain = this.detectProjectDomain(project);
  const examples = PROJECT_TEMPLATES[domain].examples;
  
  return examples.map(ex => `
Example:
Q: ${ex.question}
Context: ${ex.context}
Response: ${ex.idealResponse}
SQL: ${ex.sqlQuery}
  `).join('\n\n');
}
```

#### Pros:
- ✅ High quality examples
- ✅ Consistent responses
- ✅ No training required
- ✅ Works immediately

#### Cons:
- ⚠️ Manual curation needed
- ⚠️ Doesn't scale to all domains
- ⚠️ Static examples

#### Effort: **Medium** (2-3 weeks)
#### Impact: **High** (50-70% improvement)

---

### Strategy 3: **Fine-Tuning with LoRA/QLoRA** ⭐⭐⭐
**Best for production, long-term solution**

#### What is LoRA?
**LoRA (Low-Rank Adaptation)** - Efficient fine-tuning method that:
- Trains only small adapter layers (not the full model)
- Requires much less VRAM (8GB vs 80GB)
- Can be swapped per-project

#### Implementation Architecture:
```
Base Model: Qwen2.5:7B
    ↓
Project A LoRA Adapter (10MB) → Specialized for Survey System
Project B LoRA Adapter (10MB) → Specialized for E-commerce
Project C LoRA Adapter (10MB) → Specialized for CRM
```

#### Training Pipeline:
```bash
# 1. Collect training data (JSON format)
{
  "conversations": [
    {
      "messages": [
        {"role": "system", "content": "Schema: ..."},
        {"role": "user", "content": "Show approval rates"},
        {"role": "assistant", "content": "I'll create a chart..."}
      ]
    }
  ]
}

# 2. Fine-tune with LoRA using Unsloth
python train_lora.py \
  --base_model "Qwen/Qwen2.5-7B-Instruct" \
  --dataset "project_conversations.json" \
  --lora_r 16 \
  --lora_alpha 32 \
  --output_dir "./models/project_A_lora"

# 3. Merge LoRA or load dynamically
ollama create project-a-model -f Modelfile
```

#### Data Collection Strategy:
```typescript
// Auto-collect training data from user interactions
async collectTrainingData(
  conversationId: string,
  userFeedback: 'positive' | 'negative'
) {
  if (userFeedback === 'positive') {
    const conversation = await this.getFullConversation(conversationId);
    
    await this.prisma.trainingData.create({
      data: {
        projectId: conversation.projectId,
        input: conversation.userQuery,
        output: conversation.aiResponse,
        context: conversation.schemaContext,
        quality: 'verified',
      }
    });
  }
}
```

#### Pros:
- ✅ True learning - model adapts to project
- ✅ Best accuracy gains (70-90%)
- ✅ Can switch models per project
- ✅ Efficient (LoRA is small)

#### Cons:
- ⚠️ Requires GPU for training
- ⚠️ Need quality training data (100+ examples)
- ⚠️ Complex setup
- ⚠️ 2-4 hours training time per model

#### Effort: **High** (4-6 weeks)
#### Impact: **Very High** (70-90% improvement)

---

### Strategy 4: **Prompt Engineering + Chain-of-Thought** ⭐⭐⭐⭐
**Quick wins, no training needed**

#### Improved Prompt Template:
```typescript
const ENHANCED_SYSTEM_PROMPT = `
You are an expert data analyst for "${project.name}".

DATABASE SCHEMA:
${structuredSchema}

REASONING FRAMEWORK:
When answering questions, follow this thought process:
1. UNDERSTAND: What is the user asking?
2. IDENTIFY: Which tables/columns are relevant?
3. VALIDATE: Does the schema support this query?
4. CONSTRUCT: Build the SQL query step-by-step
5. EXPLAIN: Describe what the query does
6. VISUALIZE: If appropriate, suggest chart type

RESPONSE PATTERN:
- Start with "I understand you want to..."
- List the relevant tables/columns
- Show the SQL query with comments
- Explain the results
- Suggest visualization if applicable

PAST SUCCESSFUL PATTERNS:
${ragExamples}

Remember: Use ONLY columns that exist in the schema above.
`;
```

#### Pros:
- ✅ Immediate implementation
- ✅ No infrastructure changes
- ✅ Highly customizable
- ✅ Works with any model

#### Cons:
- ⚠️ Limited improvement (20-30%)
- ⚠️ Token overhead

#### Effort: **Very Low** (1 week)
#### Impact: **Medium** (20-30% improvement)

---

### Strategy 5: **Active Learning Loop** ⭐⭐⭐⭐⭐
**Long-term, self-improving system**

#### How It Works:
```
User Query → LLM Response → User Feedback → Update Training Data → Periodic Retraining
```

#### Implementation:
```typescript
// 1. Capture user feedback
interface UserFeedback {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  correction?: string;
  wasHelpful: boolean;
}

// 2. Store for training
async saveFeedback(feedback: UserFeedback) {
  const message = await this.prisma.chatMessage.findUnique({
    where: { id: feedback.messageId }
  });

  if (feedback.rating >= 4) {
    // Good example - add to training set
    await this.addToTrainingSet(message);
  } else if (feedback.correction) {
    // User corrected the response
    await this.addCorrectedExample(message, feedback.correction);
  }
}

// 3. Periodic retraining trigger
async checkAndTriggerRetraining(projectId: string) {
  const newExamples = await this.getNewTrainingExamples(projectId);
  
  if (newExamples.length >= 100) {
    // Enough data to retrain
    await this.queueLoRATraining(projectId, newExamples);
  }
}
```

#### Pros:
- ✅ Continuously improving
- ✅ User-driven accuracy
- ✅ Self-optimizing

#### Cons:
- ⚠️ Requires user participation
- ⚠️ Complex orchestration
- ⚠️ Feedback bias

#### Effort: **High** (6-8 weeks)
#### Impact: **Very High** (continuous improvement)

---

## 🚀 Recommended Implementation Roadmap

### Phase 1: Quick Wins (Weeks 1-2)
**Goal:** 30-40% accuracy improvement

1. ✅ **Implement RAG with Weaviate**
   - Store successful Q&A pairs
   - Retrieve similar conversations
   - Inject into context

2. ✅ **Enhanced Prompt Engineering**
   - Add chain-of-thought reasoning
   - Include response patterns
   - Better schema structuring

3. ✅ **Few-shot examples library**
   - Create 20-30 curated examples
   - Cover common query types
   - Domain-specific patterns

**Code Changes Needed:**
```typescript
// Add to chatbot.service.ts
async buildEnhancedContext(project: Project, query: string) {
  const schema = this.buildStructuredContext(project);
  const ragExamples = await this.buildRAGContext(project, query);
  const fewShot = await this.getProjectTemplateExamples(project);
  
  return {
    schema,
    ragExamples,
    fewShot,
    reasoning: CHAIN_OF_THOUGHT_FRAMEWORK
  };
}
```

### Phase 2: Medium-term (Weeks 3-6)
**Goal:** 60-70% accuracy improvement

1. ✅ **User Feedback System**
   - Add thumbs up/down to messages
   - Collect corrections
   - Track successful queries

2. ✅ **Training Data Collection**
   - Auto-save good interactions
   - Version control schemas
   - Quality scoring

3. ✅ **LoRA Fine-tuning Setup**
   - Setup training infrastructure
   - Create first project-specific adapter
   - A/B test vs base model

**New Tables Needed:**
```prisma
model TrainingExample {
  id          String   @id @default(uuid())
  projectId   String
  input       String   @db.Text
  output      String   @db.Text
  context     Json
  quality     Int      // 1-5 rating
  verified    Boolean  @default(false)
  createdAt   DateTime @default(now())
  
  project Project @relation(fields: [projectId], references: [id])
}

model UserFeedback {
  id        String   @id @default(uuid())
  messageId String
  rating    Int      // 1-5
  helpful   Boolean
  comment   String?
  createdAt DateTime @default(now())
}
```

### Phase 3: Production (Weeks 7-12)
**Goal:** 80-90% accuracy, automated improvement

1. ✅ **Automated Retraining Pipeline**
   - Scheduled LoRA training
   - Model versioning
   - A/B testing framework

2. ✅ **Multi-model Support**
   - Base model for new projects
   - Fine-tuned models for mature projects
   - Dynamic model selection

3. ✅ **Performance Monitoring**
   - Track accuracy metrics
   - User satisfaction scores
   - SQL query success rates

---

## 💾 Infrastructure Requirements

### For RAG (Phase 1):
```yaml
Current: Weaviate already running ✓
Additional: None needed
Cost: $0
```

### For LoRA Training (Phase 2-3):
```yaml
GPU Server:
  - NVIDIA GPU: RTX 4090 (24GB VRAM) or A100 (40GB)
  - CPU: 16+ cores
  - RAM: 64GB+
  - Storage: 500GB SSD

OR Cloud Options:
  - RunPod: $0.39/hr (RTX 4090)
  - Lambda Labs: $0.50/hr (A100)
  - Google Colab Pro+: $50/month

Training Time:
  - Small model (1.5B): 30min - 1hr
  - Medium model (7B): 2-4 hours
  - Per project adapter: 1-2 hours
```

---

## 📊 Expected Results Timeline

| Phase | Time | Accuracy Gain | Implementation |
|-------|------|--------------|----------------|
| **Current** | - | Baseline (40%) | Generic LLM + Schema |
| **Phase 1** | 2 weeks | +30% → 70% | RAG + Prompts |
| **Phase 2** | 4 weeks | +15% → 85% | Feedback + Few-shot |
| **Phase 3** | 8 weeks | +10% → 95% | LoRA Fine-tuning |

---

## 🛠️ Practical Next Steps

### This Week:
1. ✅ Implement conversation storage in Weaviate
2. ✅ Build RAG retrieval function
3. ✅ Update system prompts with examples
4. ✅ Test with sample conversations

### Next Week:
1. ✅ Add user feedback UI (thumbs up/down)
2. ✅ Create training data collection
3. ✅ Build few-shot examples library
4. ✅ Measure baseline accuracy

### Week 3-4:
1. ✅ Setup GPU environment
2. ✅ Prepare training data format
3. ✅ Train first LoRA adapter
4. ✅ A/B test results

---

## 🎓 Training Data Format Example

```json
{
  "project_id": "survey-dashboard-001",
  "domain": "survey_analytics",
  "examples": [
    {
      "schema": {
        "tables": ["reports", "users", "responses"],
        "columns": {
          "reports": ["id", "title", "status", "created_at"]
        }
      },
      "conversation": [
        {
          "role": "user",
          "content": "Show me approval rates over time"
        },
        {
          "role": "assistant",
          "content": "I'll create a line chart showing approval percentages by month. Here's the query:\n\n```sql\nSELECT \n  DATE_FORMAT(created_at, '%Y-%m') as month,\n  SUM(CASE WHEN status = 'Approved' THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as approval_rate\nFROM reports\nGROUP BY DATE_FORMAT(created_at, '%Y-%m')\nORDER BY month;\n```\n\nAnd here's the visualization:\n\n```chart\n{\n  \"type\": \"line\",\n  \"data\": [...]\n}\n```"
        }
      ],
      "metadata": {
        "quality_score": 5,
        "user_feedback": "perfect",
        "execution_success": true
      }
    }
  ]
}
```

---

## 🔍 Measuring Success

### Key Metrics:
1. **SQL Query Success Rate** - % of generated queries that execute without errors
2. **User Satisfaction** - Average rating (1-5 stars)
3. **Response Accuracy** - Correct schema references / Total responses
4. **Chart Relevance** - Appropriate visualization suggestions
5. **Token Efficiency** - Response quality vs tokens used

### Monitoring Dashboard:
```typescript
interface AccuracyMetrics {
  sqlSuccessRate: number;      // Target: >90%
  avgUserRating: number;        // Target: >4.2/5
  schemaAccuracy: number;       // Target: >95%
  chartRelevance: number;       // Target: >85%
  avgResponseTime: number;      // Target: <3s
}
```

---

## 💡 Key Recommendations

### Start with RAG (Immediate ROI):
```typescript
// Priority 1: Implement this ASAP
async enhancedChat(projectId: string, query: string) {
  // 1. Get similar past conversations
  const similar = await this.ragRetrieval(projectId, query);
  
  // 2. Build context with examples
  const context = this.buildContextWithExamples(project, similar);
  
  // 3. Generate response
  return this.llm.generate(context, query);
}
```

### Collect Data Continuously:
```typescript
// Every interaction is training data
afterEach(async (conversation) => {
  await this.storeForTraining({
    input: conversation.query,
    output: conversation.response,
    feedback: await this.waitForFeedback(conversation.id, timeout: 5min)
  });
});
```

### Plan for Fine-tuning Later:
- Start collecting data now
- Aim for 500+ examples per project domain
- Train first LoRA adapter in 4-6 weeks

---

## 🎯 Conclusion

**Best Strategy for Your Platform:**

1. **Short-term (Now):** RAG + Prompt Engineering
   - Quick wins
   - No infrastructure changes
   - 30-40% improvement

2. **Medium-term (1-2 months):** Add User Feedback + Few-shot Learning
   - Collect training data
   - Build example libraries
   - 60-70% total improvement

3. **Long-term (3+ months):** LoRA Fine-tuning per Project
   - Project-specific models
   - Continuous improvement
   - 80-90%+ accuracy

**Start today with RAG - you already have Weaviate set up!** 🚀
