import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Zap, X, Lightbulb, ChevronUp, ChevronDown, ArrowRight, ArrowLeft, Check, Maximize2, Star, Plus, Sparkles } from 'lucide-react';

function CircleNode({ node, pos, size, color, isSelected, onSelect }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute"
      style={{
        left: `${pos.x - size / 2}px`,
        top: `${pos.y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: isHovered || isSelected ? 10 : 2
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div
        className="w-full h-full rounded-full cursor-pointer transition-all"
        style={{
          backgroundColor: color,
          transform: isHovered ? 'scale(1.5)' : 'scale(1)',
          boxShadow: isSelected ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none'
        }}
      />
      {isHovered && (
        <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 bg-white px-3 py-2 rounded-lg shadow-lg border border-gray-200 whitespace-nowrap text-sm z-20">
          {node.text}
        </div>
      )}
    </div>
  );
}

export default function IdeaTreeGenerator() {
  const [mode, setMode] = useState('exploration');
  const [inputValue, setInputValue] = useState('');
  const [landingInputValue, setLandingInputValue] = useState(''); // Landing page input
  const [nodes, setNodes] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedNode, setFocusedNode] = useState(null);
  const [creativityHistory, setCreativityHistory] = useState([]);
  const [showFullGraph, setShowFullGraph] = useState(false);
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'report'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'timeline'
  const [editCount, setEditCount] = useState(0);
  const [aiGenerationCount, setAiGenerationCount] = useState(0);
  const [selectedForStructure, setSelectedForStructure] = useState(new Set());
  const [hierarchyAnalysis, setHierarchyAnalysis] = useState(null);
  const [analyzingStructure, setAnalyzingStructure] = useState(false);
  const [structureReflections, setStructureReflections] = useState([]);
  const [focusedReflection, setFocusedReflection] = useState(null);
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [structureGridPositions, setStructureGridPositions] = useState({});
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedStructureNode, setSelectedStructureNode] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // Track current exploration step
  const [designTopic, setDesignTopic] = useState(''); // Store the initial design topic
  const [topicNodeId, setTopicNodeId] = useState(null); // Store the TOPIC node ID
  const [hoveredNodeId, setHoveredNodeId] = useState(null); // Track which node is hovered
  const nodeRefs = useRef({});
  const reflectionRefs = useRef({});

  // Check if we should show landing page (no nodes exist yet)
  const showLandingPage = nodes.length === 0 && !loading;

  useEffect(() => {
    const saved = localStorage.getItem('ideaTreeData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setNodes(data.nodes || []);
        setReflections(data.reflections || []);
        setCreativityHistory(data.creativityHistory || []);
        setEditCount(data.editCount || 0);
        setAiGenerationCount(data.aiGenerationCount || 0);
        setHierarchyAnalysis(data.hierarchyAnalysis || null);
        setStructureReflections(data.structureReflections || []);
        setDesignTopic(data.designTopic || '');
        setTopicNodeId(data.topicNodeId || null);

        // Determine current step from nodes
        if (data.nodes && data.nodes.length > 0) {
          const maxStep = Math.max(...data.nodes.map(n => n.step || 1));
          setCurrentStep(Math.max(1, Math.min(4, maxStep + 1))); // Next step to work on
        } else {
          setCurrentStep(data.currentStep || 1);
        }
      } catch (e) {
        console.error('Failed to load saved data:', e);
      }
    }

    // Keyboard event listeners for space bar panning
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const dataToSave = {
      nodes,
      reflections,
      creativityHistory,
      editCount,
      aiGenerationCount,
      hierarchyAnalysis,
      structureReflections,
      currentStep,
      designTopic,
      topicNodeId
    };
    localStorage.setItem('ideaTreeData', JSON.stringify(dataToSave));
  }, [nodes, reflections, creativityHistory, editCount, aiGenerationCount, hierarchyAnalysis, structureReflections, currentStep, designTopic, topicNodeId]);

  // Calculate Creativity Index using TTCT + Dependency Framework
  const calculateCreativityIndex = () => {
    if (nodes.length === 0) return { creativity: 0, dependency: 0 };

    // Fluency (F): number of ideas generated (count, weight 0.25)
    // Normalize: assuming max 100 nodes, but will use relative scaling
    const maxExpectedNodes = 100;
    const fluency = Math.min(nodes.length / maxExpectedNodes, 1);

    // Flexibility (X): variety of idea categories (unique types, weight 0.25)
    const uniqueTypes = new Set(nodes.map(n => n.type));
    const flexibility = uniqueTypes.size / 4; // max 4 types: main, sub, insight, opportunity

    // Originality (O): novelty of ideas (semantic similarity, weight 0.30)
    // Calculate similarity between node texts using word overlap
    const calculateSimilarity = (text1, text2) => {
      if (!text1 || !text2) return 0;
      const words1 = new Set(text1.toLowerCase().split(/\s+/));
      const words2 = new Set(text2.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(w => words2.has(w)));
      const union = new Set([...words1, ...words2]);
      return union.size > 0 ? intersection.size / union.size : 0;
    };

    let totalSimilarity = 0;
    let comparisonCount = 0;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        totalSimilarity += calculateSimilarity(nodes[i].text, nodes[j].text);
        comparisonCount++;
      }
    }
    const avgSimilarity = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
    // Originality is inverse of similarity (lower similarity = higher originality)
    const originality = 1 - avgSimilarity;

    // Elaboration (E): depth and linkage (density + length, weight 0.20)
    // Calculate connection density: number of edges / possible edges
    const edges = nodes.filter(n => n.parentId || (n.parentIds && n.parentIds.length > 0)).length;
    const possibleEdges = nodes.length > 1 ? (nodes.length * (nodes.length - 1)) / 2 : 0;
    const density = possibleEdges > 0 ? edges / nodes.length : 0; // normalize by node count

    // Average text length
    const avgLength = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + (n.text?.length || 0), 0) / nodes.length
      : 0;
    const maxExpectedLength = 100;
    const lengthScore = Math.min(avgLength / maxExpectedLength, 1);

    const elaboration = (density * 0.5) + (lengthScore * 0.5);

    // Dependency (D): reliance on AI suggestions (AI nodes ÷ total nodes, weight –0.20)
    // AI nodes are those generated by AI (all nodes are AI-generated unless manually created)
    // For now, all nodes are AI-generated, but we can track manually created nodes later
    const aiNodes = nodes.filter(n => !n.manuallyCreated);
    const dependency = nodes.length > 0 ? Math.min(aiNodes.length / nodes.length, 1) : 0;

    // Final formula: CI' = 0.25F + 0.25X + 0.30O + 0.20E – 0.20D
    const creativity = (0.25 * fluency) + (0.25 * flexibility) + (0.30 * originality) + (0.20 * elaboration) - (0.20 * dependency);

    return {
      creativity: Math.max(0, Math.min(1, creativity)),
      dependency: Math.max(0, Math.min(1, dependency)),
      fluency,
      flexibility,
      originality,
      elaboration
    };
  };

  // Legacy function for backward compatibility
  const calculateCreativityGravity = () => {
    const { creativity } = calculateCreativityIndex();
    return creativity;
  };

  // Extract keyword from text (fallback for nodes without keyword)
  const extractKeyword = (text) => {
    if (!text) return '';
    // Take first 2-4 words as keyword
    const words = text.trim().split(/\s+/);
    if (words.length <= 4) return text;
    return words.slice(0, 3).join(' ');
  };

  // Handle Start Exploration from Landing Page
  const handleStartExploration = async () => {
    if (!landingInputValue.trim()) {
      alert('Please enter your idea first.');
      return;
    }

    const topicText = landingInputValue.trim();
    setDesignTopic(topicText);
    setLoading(true);

    try {
      // First, create TOPIC node
      const topicNodeId = Date.now();
      const topicNode = {
        id: topicNodeId,
        text: topicText,
        keyword: extractKeyword(topicText),
        type: 'topic',
        step: 0,
        category: 'TOPIC',
        parentId: null,
        x: 600, // Center of canvas
        y: 100, // Top area
        level: 0,
        manuallyPositioned: false
      };

      setNodes([topicNode]);
      setTopicNodeId(topicNodeId);

      // Then generate Step 1 nodes (Context, User, Task, Goal) as children of TOPIC
      await generateStep1ProblemFraming(topicText, topicNodeId);
    } catch (err) {
      console.error('Start exploration error:', err);
      alert('An error occurred while starting exploration.');
      setLoading(false);
    }
  };

  // Step 1: Problem Framing - 4 main nodes (Context, User, Task, Goal) - ALL AT ONCE
  const generateStep1ProblemFraming = async (designTopic, parentTopicId = null) => {
    setDesignTopic(designTopic);
    try {
      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Given a design topic, generate 4 problem-framing nodes following this structure:

Design Topic: "${designTopic}"

🔶 STEP 1: PROBLEM FRAMING

🟢 GOAL:
Output 4 main problem-framing nodes:
- Context: Where does the problem occur?
- User: Who is involved and what characterizes them?
- Task: What actions, behaviors, or processes are relevant?
- Goal: What outcome or value is the user pursuing?

🟡 CONSTRAINTS:
- Output only the 4 node titles
- No sub-details, no insights, no opinions
- Do NOT include any opportunities or solutions
- Each node should be a concise phrase (5-10 words)

🟠 FORMAT (MUST FOLLOW EXACTLY):
Respond ONLY in JSON format:
{
  "nodes": [
    { "category": "Context", "text": "...", "keyword": "...", "reflection": "..." },
    { "category": "User", "text": "...", "keyword": "...", "reflection": "..." },
    { "category": "Task", "text": "...", "keyword": "...", "reflection": "..." },
    { "category": "Goal", "text": "...", "keyword": "...", "reflection": "..." }
  ]
}

Note: 
- "keyword" should be a concise 2-5 word phrase that captures the essence of the node text.
- "reflection" (optional): If you have valuable advice, suggestions, or broader perspective insights for this node, provide a brief 1-2 sentence reflection. If not applicable, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const newNodes = parsed.nodes.map((nodeObj, index) => {
        const nodeId = Date.now() + index;

        // Create reflection if provided
        if (nodeObj.reflection) {
          setReflections(prev => [{
            id: nodeId + 10000,
            nodeId: nodeId,
            topic: nodeObj.text,
            content: nodeObj.reflection,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev]);
        }

        return {
          id: nodeId,
          text: nodeObj.text,
          keyword: nodeObj.keyword || extractKeyword(nodeObj.text),
          type: 'main',
          step: 1,
          category: nodeObj.category,
          parentId: parentTopicId, // Connect to TOPIC node
          x: 300 + (index * 250),
          y: 250, // Below TOPIC node
          level: 1,
          manuallyPositioned: false
        };
      });

      setNodes(prev => [...prev, ...newNodes]);
      setCurrentStep(2); // Move to step 2 after step 1 completion

      const newMetrics = calculateCreativityIndex();
      setCreativityHistory(prev => [...prev, newMetrics]);
    } catch (err) {
      console.error('Step 1 generation error:', err);
      alert('An error occurred while generating problem framing nodes.');
    }
    setLoading(false);
  };

  // Step 2: Sub-node Expansion - Helper for multi-selection (returns nodes)
  const generateStep2SubNodesForMulti = async (parentNode) => {
    if (parentNode.type !== 'main' || parentNode.step !== 1) return [];

    // Check if already expanded
    const existingChildren = nodes.filter(n => n.parentId === parentNode.id || (n.parentIds && n.parentIds.includes(parentNode.id)));
    if (existingChildren.length > 0) return [];

    return await generateStep2SubNodesInternal(parentNode);
  };

  // Step 2: Sub-node Expansion - Internal function
  const generateStep2SubNodesInternal = async (parentNode) => {
    try {
      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Given a main problem-framing node, expand it into 1-3 concrete, specific sub-nodes (generate 1, 2, or 3 based on what makes sense).

Main Node: [${parentNode.category}] ${parentNode.text}

🔶 STEP 2: SUB-NODE EXPANSION

🟢 GOAL:
Expand the main node into 1-3 concrete, specific sub-nodes that help detail the space.

🟡 CONSTRAINTS:
- Generate 1, 2, or 3 sub-nodes (choose the number that makes most sense)
- Sub-nodes must be grounded in real-world places, actors, actions, or goals
- Avoid abstract categories (e.g., "Public Space" → ✘; "Hospital Waiting Room" → ✔)
- Avoid including user pain points, opinions, or ideas
- Avoid jumping ahead to solutions
- Each sub-node should be specific and concrete (5-15 words)

🟠 FORMAT:
Respond ONLY in JSON format:
{
  "subNodes": [
    { "text": "...", "keyword": "...", "reflection": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2-4 word phrase that captures the essence of the sub-node text.
- "reflection" (optional): If you have valuable advice, suggestions, or broader perspective insights for this sub-node, provide a brief 1-2 sentence reflection. If not applicable, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const parentPos = getNodePosition(parentNode);
      const siblings = nodes.filter(n => n.parentId === parentNode.id);

      const newNodes = parsed.subNodes.map((subNodeObj, index) => {
        const nodeId = Date.now() + index;

        // Create reflection if provided
        if (subNodeObj.reflection) {
          setReflections(prev => [{
            id: nodeId + 10000,
            nodeId: nodeId,
            topic: subNodeObj.text,
            content: subNodeObj.reflection,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev]);
        }

        return {
          id: nodeId,
          text: subNodeObj.text,
          keyword: subNodeObj.keyword || extractKeyword(subNodeObj.text),
          type: 'sub',
          step: 2,
          category: parentNode.category,
          parentId: parentNode.id,
          x: parentPos.x + (index - 1) * 200,
          y: parentPos.y + 150,
          level: 1,
          manuallyPositioned: false
        };
      });

      setNodes(prev => [...prev, ...newNodes]);
      setCurrentStep(3); // Move to step 3 after step 2 completion

      const newMetrics = calculateCreativityIndex();
      setCreativityHistory(prev => [...prev, newMetrics]);

      return newNodes;
    } catch (err) {
      console.error('Step 2 generation error:', err);
      alert('An error occurred while generating sub-nodes.');
      return [];
    }
  };

  // Step 2: Sub-node Expansion - Public function (for single selection)
  const generateStep2SubNodes = async (parentNode) => {
    if (parentNode.type !== 'main' || parentNode.step !== 1) return;

    // Check if already expanded
    const existingChildren = nodes.filter(n => n.parentId === parentNode.id);
    if (existingChildren.length > 0) return;

    setLoading(true);
    await generateStep2SubNodesInternal(parentNode);
    setLoading(false);
  };

  // Step 3: User Behavior Insights - Helper for multi-selection (returns nodes)
  const generateStep3InsightsForMulti = async (parentNode) => {
    if (parentNode.type !== 'sub' || parentNode.step !== 2) return [];

    const existingChildren = nodes.filter(n => n.parentId === parentNode.id || (n.parentIds && n.parentIds.includes(parentNode.id)));
    if (existingChildren.length > 0) return [];

    return await generateStep3InsightsInternal(parentNode);
  };

  // Step 3: User Behavior Insights - Internal function
  const generateStep3InsightsInternal = async (parentNode) => {
    try {
      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Given a sub-node, generate 1-3 user behavior insights (generate 1, 2, or 3 based on what makes sense).

Sub-node: [${parentNode.category}] ${parentNode.text}

🔶 STEP 3: USER BEHAVIOR & PAIN POINT INSIGHTS

🟢 GOAL:
Generate 1-3 user behavior insights for this sub-node. Each insight should describe a specific pattern or behavior that might occur in that sub-context. The insight should **imply** a breakdown, challenge, or pain point — without directly proposing any solution or feature.

🟡 CONSTRAINTS:
- Generate 1, 2, or 3 insights (choose the number that makes most sense)
- Must focus on observable user behavior (not opinions or vague emotions)
- Each insight must imply a problem, friction, or need
- Insights must be concise (10–18 words)
- Do NOT include any solution, technology, or feature
- Do NOT repeat content across insights

🟠 FORMAT:
Respond ONLY in JSON format:
{
  "insights": [
    { "text": "...", "keyword": "...", "reflection": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2-4 word phrase that captures the essence of the insight.
- "reflection" (optional): If you have valuable advice, suggestions, or broader perspective insights for this insight, provide a brief 1-2 sentence reflection. If not applicable, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const parentPos = getNodePosition(parentNode);

      const newNodes = parsed.insights.map((insightObj, index) => {
        const nodeId = Date.now() + index;

        // Create reflection if provided
        if (insightObj.reflection) {
          setReflections(prev => [{
            id: nodeId + 10000,
            nodeId: nodeId,
            topic: insightObj.text,
            content: insightObj.reflection,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev]);
        }

        return {
          id: nodeId,
          text: insightObj.text,
          keyword: insightObj.keyword || extractKeyword(insightObj.text),
          type: 'insight',
          step: 3,
          category: parentNode.category,
          parentId: parentNode.id,
          x: parentPos.x + (index - 1) * 200,
          y: parentPos.y + 150,
          level: 2,
          manuallyPositioned: false
        };
      });

      setNodes(prev => [...prev, ...newNodes]);
      setCurrentStep(4); // Move to step 4 after step 3 completion

      const newMetrics = calculateCreativityIndex();
      setCreativityHistory(prev => [...prev, newMetrics]);

      return newNodes;
    } catch (err) {
      console.error('Step 3 generation error:', err);
      alert('An error occurred while generating insights.');
      return [];
    }
  };

  // Step 3: User Behavior Insights - Public function (for single selection)
  const generateStep3Insights = async (parentNode) => {
    if (parentNode.type !== 'sub' || parentNode.step !== 2) return;

    const existingChildren = nodes.filter(n => n.parentId === parentNode.id);
    if (existingChildren.length > 0) return;

    setLoading(true);
    await generateStep3InsightsInternal(parentNode);
    setLoading(false);
  };

  // Step 4: Design Opportunities - Helper for multi-selection (returns nodes)
  const generateStep4OpportunitiesForMulti = async (parentNode) => {
    if (parentNode.type !== 'insight' || parentNode.step !== 3) return [];

    const existingChildren = nodes.filter(n => n.parentId === parentNode.id || (n.parentIds && n.parentIds.includes(parentNode.id)));
    if (existingChildren.length > 0) return [];

    return await generateStep4OpportunitiesInternal(parentNode);
  };

  // Step 4: Design Opportunities - Internal function
  const generateStep4OpportunitiesInternal = async (parentNode) => {
    try {
      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Given a user behavior insight, generate 1-3 Design Opportunities (generate 1, 2, or 3 based on what makes sense).

Insight: ${parentNode.text}

🔶 STEP 4: DESIGN OPPORTUNITY GENERATION

🟢 GOAL:
Generate 1-3 Design Opportunities per insight. A Design Opportunity is:
- A conceptual **reframing of a problem**
- A potential **space for innovation or exploration**
- NOT a solution, UI, or feature

🟡 CONSTRAINTS:
- Generate 1, 2, or 3 opportunities (choose the number that makes most sense)
- DO NOT include technology, tools, or implementation (e.g., "AI," "Camera," "QR Code," etc.)
- DO NOT copy or paraphrase the insight
- DO NOT propose features
- Each opportunity must be 8–16 words
- Must be conceptually distinct and usable as a prompt for future ideation
- Focus on the problem space, not solution space

🟠 FORMAT:
Respond ONLY in JSON format:
{
  "opportunities": [
    { "text": "Opportunity to...", "keyword": "...", "reflection": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2-4 word phrase that captures the essence of the opportunity.
- "reflection" (optional): If you have valuable advice, suggestions, or broader perspective insights for this opportunity, provide a brief 1-2 sentence reflection. If not applicable, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const parentPos = getNodePosition(parentNode);

      const newNodes = parsed.opportunities.map((oppObj, index) => {
        const nodeId = Date.now() + index;

        // Create reflection if provided
        if (oppObj.reflection) {
          setReflections(prev => [{
            id: nodeId + 10000,
            nodeId: nodeId,
            topic: oppObj.text,
            content: oppObj.reflection,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev]);
        }

        return {
          id: nodeId,
          text: oppObj.text,
          keyword: oppObj.keyword || extractKeyword(oppObj.text),
          type: 'opportunity',
          step: 4,
          category: parentNode.category,
          parentId: parentNode.id,
          x: parentPos.x + (index - 1) * 200,
          y: parentPos.y + 150,
          level: 3,
          manuallyPositioned: false
        };
      });

      setNodes(prev => [...prev, ...newNodes]);

      const newMetrics = calculateCreativityIndex();
      setCreativityHistory(prev => [...prev, newMetrics]);

      return newNodes;
    } catch (err) {
      console.error('Step 4 generation error:', err);
      alert('An error occurred while generating design opportunities.');
      return [];
    }
  };

  // Step 4: Design Opportunities - Public function (for single selection)
  const generateStep4Opportunities = async (parentNode) => {
    if (parentNode.type !== 'insight' || parentNode.step !== 3) return;

    const existingChildren = nodes.filter(n => n.parentId === parentNode.id);
    if (existingChildren.length > 0) return;

    setLoading(true);
    await generateStep4OpportunitiesInternal(parentNode);
    setLoading(false);
  };

  // Legacy function name for compatibility (Step 1 wrapper)
  const generateIdeas = async (prompt, parentId = null) => {
    if (parentId === null) {
      // Step 1: Initial problem framing
      await generateStep1ProblemFraming(prompt);
    }
  };

  const analyzeHierarchy = async () => {
    if (selectedForStructure.size === 0) {
      alert('Please select at least one node to analyze.');
      return;
    }

    setAnalyzingStructure(true);
    try {
      const selectedNodesData = nodes
        .filter(n => selectedForStructure.has(n.id))
        .map(node => ({
          id: node.id,
          text: node.text,
          parentId: node.parentId,
          level: node.level,
          hasReflection: reflections.some(r => r.nodeId === node.id)
        }));

      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: `Analyze these brainstormed ideas using an Impact-Feasibility framework for design opportunities.

Ideas:
${JSON.stringify(selectedNodesData, null, 2)}

For each idea, evaluate and provide:
- impact: score from 1-10 (user value and problem-solving degree)
- feasibility: score from 1-10 (technical complexity and implementation cost - higher score means easier to implement)
- category: a brief category/theme label
- analysis: AI analysis of why this idea matters and what considerations exist (2-3 sentences)
- recommendedAction: specific actionable recommendation based on the quadrant (1-2 sentences)

Impact considers:
- User value provided
- Degree of problem solving
- Experience improvement

Feasibility considers:
- Technical complexity (inverse - simpler = higher score)
- Implementation cost (inverse - cheaper = higher score)
- Resource requirements (inverse - fewer = higher score)

Also suggest:
- mainThemes: 3-5 main themes these ideas fall into
- relationships: key connections between ideas

Respond ONLY in JSON format:
{
  "analysis": [
    {
      "nodeId": number,
      "impact": number (1-10),
      "feasibility": number (1-10),
      "category": "string",
      "analysis": "string",
      "recommendedAction": "string"
    }
  ],
  "mainThemes": ["theme1", "theme2", ...],
  "relationships": ["connection description", ...]
}`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      setHierarchyAnalysis(parsed);

      const newStructureReflections = [];
      parsed.analysis.forEach((analysis, index) => {
        if (analysis.reflection) {
          const node = selectedNodesData.find(n => n.id === analysis.nodeId);
          newStructureReflections.push({
            id: Date.now() + index,
            nodeId: analysis.nodeId,
            topic: node?.text || 'Unknown',
            content: analysis.reflection,
            timestamp: new Date().toLocaleTimeString()
          });
        }
      });
      setStructureReflections(newStructureReflections);

      setMode('structure');
    } catch (err) {
      console.error('Analysis error:', err);
      alert('An error occurred while analyzing the hierarchy.');
    }
    setAnalyzingStructure(false);
  };

  const toggleNodeSelection = (nodeId) => {
    setSelectedForStructure(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleNodeClick = (node) => {
    if (editingNode === node.id) return;
    setSelectedNode(selectedNode === node.id ? null : node.id);
  };

  const handleEdit = (node) => {
    setEditingNode(node.id);
    setEditValue(node.text);
    setSelectedNode(null);
  };

  const handleEditSave = () => {
    setNodes(prev => prev.map(n =>
      n.id === editingNode ? { ...n, text: editValue } : n
    ));

    const newEditCount = editCount + 1;
    setEditCount(newEditCount);

    const newMetrics = calculateCreativityIndex();
    setCreativityHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = newMetrics;
      }
      return updated;
    });

    setEditingNode(null);
    setEditValue('');
  };

  // Multi-selection Generate: AI decides what to generate based on selected nodes
  const generateMultiSelection = async (selectedNodesList) => {
    if (selectedNodesList.length === 0) return;

    setLoading(true);
    try {
      // Use current nodes state for generation
      const currentNodes = nodes;
      // Build context from selected nodes with their text for matching
      const nodesInfo = selectedNodesList.map((node, idx) => ({
        index: idx + 1,
        text: node.text,
        type: node.type,
        step: node.step,
        category: node.category || null
      }));

      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          messages: [
            {
              role: "user",
              content: `You are analyzing selected nodes from a design thinking framework to determine what new nodes should be generated.

Design Topic: "${designTopic || 'Design topic'}"

Selected Nodes:
${nodesInfo.map(n => `${n.index}. [${n.type}, Step ${n.step}${n.category ? `, ${n.category}` : ''}] "${n.text}"`).join('\n')}

Available Framework Steps:
- Step 1: Main nodes (Context, User, Task, Goal) - type: "main"
- Step 2: Sub-nodes - type: "sub" 
- Step 3: User Behavior Insights - type: "insight"
- Step 4: Design Opportunities - type: "opportunity"

Your task:
1. Analyze the selected nodes and the design context
2. Determine what type(s) of nodes should be generated next - be creative and flexible
3. You can generate:
   - Main nodes (if missing categories or new perspective needed)
   - Sub-nodes (for main nodes)
   - Insights (for sub-nodes)
   - Opportunities (for insights)
   - OR any combination - don't limit yourself to "next step" only!

Constraints:
- Generate 1-3 nodes per selected node
- Follow the framework structure but be flexible
- Generate what makes most sense for advancing the design thinking process
- Each node should follow its step's constraints

Respond ONLY in JSON format:
{
  "decisions": [
    {
      "selectedNodeIndex": 1-${nodesInfo.length} (which selected node to generate from),
      "nodeType": "main" | "sub" | "insight" | "opportunity",
      "step": 1 | 2 | 3 | 4,
      "category": "Context" | "User" | "Task" | "Goal" | null,
      "reasoning": "Brief explanation why this generation makes sense"
    }
  ]
}`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      // Process each decision and generate nodes
      // Collect all generated nodes to link them to all selected nodes
      const allGeneratedNodes = [];

      for (const decision of parsed.decisions) {
        const targetNode = selectedNodesList[decision.selectedNodeIndex - 1];
        if (!targetNode) continue;

        let generatedNodes = [];

        // Generate based on decision - use appropriate function
        if (decision.nodeType === 'main') {
          // Generate new main node
          const newNode = await generateMainNodeFromMulti(decision.category || 'Context');
          if (newNode) generatedNodes = [newNode];
        } else if (decision.nodeType === 'sub') {
          // Check if targetNode can have sub-nodes (main node)
          if (targetNode.type === 'main') {
            generatedNodes = await generateStep2SubNodesForMulti(targetNode);
          }
        } else if (decision.nodeType === 'insight') {
          // Check if targetNode can have insights (sub node)
          if (targetNode.type === 'sub') {
            generatedNodes = await generateStep3InsightsForMulti(targetNode);
          }
        } else if (decision.nodeType === 'opportunity') {
          // Check if targetNode can have opportunities (insight)
          if (targetNode.type === 'insight') {
            generatedNodes = await generateStep4OpportunitiesForMulti(targetNode);
          }
        }

        allGeneratedNodes.push(...generatedNodes);
      }

      // Link all generated nodes to all selected nodes (if multiple selected)
      if (allGeneratedNodes.length > 0 && selectedNodesList.length > 1) {
        const parentIds = selectedNodesList.map(sn => sn.id);
        setNodes(prev => prev.map(node => {
          if (allGeneratedNodes.some(gn => gn.id === node.id)) {
            // Add all selected node IDs as parents
            return { ...node, parentIds: parentIds, parentId: parentIds[0] }; // Keep parentId for backward compatibility
          }
          return node;
        }));
      }

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const newMetrics = calculateCreativityIndex();
      setCreativityHistory(prev => [...prev, newMetrics]);
    } catch (err) {
      console.error('Multi-selection generation error:', err);
      alert('An error occurred while generating from selected nodes.');
    }
    setLoading(false);
  };

  // Helper: Generate main node from multi-selection (returns node)
  const generateMainNodeFromMulti = async (category) => {
    // Reuse Step 1 logic but for single node
    try {
      const response = await fetch("http://localhost:3001/api/anthropic", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `Given a design topic, generate ONE problem-framing node for the ${category} category.

Design Topic: "${designTopic || 'Design topic'}"

🔶 STEP 1: PROBLEM FRAMING

🟢 GOAL:
Generate ONE main problem-framing node for ${category}:
${category === 'Context' ? '- Context: Where does the problem occur?' : ''}
${category === 'User' ? '- User: Who is involved and what characterizes them?' : ''}
${category === 'Task' ? '- Task: What actions, behaviors, or processes are relevant?' : ''}
${category === 'Goal' ? '- Goal: What outcome or value is the user pursuing?' : ''}

🟡 CONSTRAINTS:
- Output only ONE node title
- No sub-details, no insights, no opinions
- Do NOT include any opportunities or solutions
- Should be a concise phrase (5-10 words)

🟠 FORMAT (MUST FOLLOW EXACTLY):
Respond ONLY in JSON format:
{
  "text": "...",
  "keyword": "..."
}

Note: "keyword" should be a concise 2-5 word phrase that captures the essence of the node text.`
            }
          ],
        })
      });

      const data = await response.json();
      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const existingMainNodes = nodes.filter(n => n.type === 'main' && n.step === 1);
      const nodeId = Date.now();
      const newNode = {
        id: nodeId,
        text: parsed.text,
        keyword: parsed.keyword || extractKeyword(parsed.text),
        type: 'main',
        step: 1,
        category: category,
        parentId: null,
        x: 200 + (existingMainNodes.length * 250),
        y: 200,
        level: 0,
        manuallyPositioned: false
      };

      setNodes(prev => [...prev, newNode]);
      return newNode;
    } catch (err) {
      console.error('Main node generation error:', err);
      alert(`An error occurred while generating ${category} node.`);
      return null;
    }
  };

  const handleGenerate = (node) => {
    // Check if multiple nodes are selected
    const selectedNodes = Array.from(selectedForStructure);
    if (selectedNodes.length > 1) {
      // Multi-selection generate
      const selectedNodesList = nodes.filter(n => selectedNodes.includes(n.id));
      generateMultiSelection(selectedNodesList);
      setSelectedForStructure(new Set());
      setSelectedNode(null);
      return;
    }

    // Single node generate - Route to appropriate step based on node type
    if (node.type === 'main' && node.step === 1) {
      generateStep2SubNodes(node);
    } else if (node.type === 'sub' && node.step === 2) {
      generateStep3Insights(node);
    } else if (node.type === 'insight' && node.step === 3) {
      generateStep4Opportunities(node);
    } else {
      // Legacy fallback
      generateIdeas(node.text, node.id);
    }
    setSelectedNode(null);
  };

  const handleDelete = (nodeId) => {
    const deleteNodeAndChildren = (id) => {
      const children = nodes.filter(n => n.parentId === id);
      children.forEach(child => deleteNodeAndChildren(child.id));
      setNodes(prev => prev.filter(n => n.id !== id));
      setReflections(prev => prev.filter(r => r.nodeId !== id));
    };
    deleteNodeAndChildren(nodeId);
    setSelectedNode(null);
    setSelectedForStructure(prev => {
      const newSet = new Set(prev);
      newSet.delete(nodeId);
      return newSet;
    });
  };

  const handleDeleteReflection = (reflectionId) => {
    setReflections(prev => prev.filter(r => r.id !== reflectionId));
  };

  const handleReflectionClick = (nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Focus and select the node
    setFocusedNode(nodeId);
    setSelectedNode(nodeId);

    // Scroll to the node
    const nodeElement = nodeRefs.current[nodeId];
    if (nodeElement) {
      nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Clear focus after 2 seconds, but keep selection
    setTimeout(() => setFocusedNode(null), 2000);
  };

  const handleReflectionAlertClick = (nodeId) => {
    const reflection = structureReflections.find(r => r.nodeId === nodeId);
    if (!reflection) return;

    setFocusedReflection(reflection.id);

    const reflectionElement = reflectionRefs.current[reflection.id];
    if (reflectionElement) {
      reflectionElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setTimeout(() => setFocusedReflection(null), 2000);
  };

  const handleMouseDown = (e, node) => {
    // 버튼 클릭 시 드래그 방지
    if (editingNode === node.id ||
      e.target.closest('button') ||
      e.target.closest('.node-controls') ||
      e.target.tagName === 'BUTTON') {
      return;
    }

    if (isSpacePressed) {
      // Start panning
      setIsPanning(true);
      setPanStart({
        x: e.clientX + e.currentTarget.scrollLeft,
        y: e.clientY + e.currentTarget.scrollTop
      });
    } else {
      // Start dragging node
      const rect = e.currentTarget.getBoundingClientRect();
      setDraggingNode(node.id);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
    e.preventDefault();
  };

  const handleCanvasMouseDown = (e) => {
    if (isSpacePressed && !e.target.closest('.absolute')) {
      setIsPanning(true);
      const container = e.currentTarget;
      setPanStart({
        x: e.clientX + container.scrollLeft,
        y: e.clientY + container.scrollTop
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning) {
      // Pan the canvas
      const container = e.currentTarget;
      container.scrollLeft = panStart.x - e.clientX;
      container.scrollTop = panStart.y - e.clientY;
      return;
    }

    if (!draggingNode) return;

    const container = e.currentTarget;
    const rect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    const newX = e.clientX - rect.left + scrollLeft - dragOffset.x;
    const newY = e.clientY - rect.top + scrollTop - dragOffset.y;

    if (mode === 'structure') {
      const gridSize = 250;
      const rowHeight = 200;

      const gridX = Math.round(newX / gridSize) * gridSize;
      const gridY = Math.round(newY / rowHeight) * rowHeight;

      let priority = 'medium';
      if (gridY < 200) priority = 'high';
      else if (gridY >= 400) priority = 'low';

      setStructureGridPositions(prev => ({
        ...prev,
        [draggingNode]: { x: gridX, y: gridY, priority }
      }));

      setNodes(prev => prev.map(n =>
        n.id === draggingNode
          ? { ...n, x: gridX, y: gridY, structurePositioned: true }
          : n
      ));
    } else {
      setNodes(prev => prev.map(n =>
        n.id === draggingNode
          ? {
            ...n,
            x: Math.max(0, newX),
            y: Math.max(0, newY),
            manuallyPositioned: true
          }
          : n
      ));
    }
  };

  const handleMouseUp = () => {
    setDraggingNode(null);
    setIsPanning(false);
  };

  const getNodePosition = (node) => {
    // If node has been manually positioned (dragged), use that position
    if (node.manuallyPositioned) {
      return { x: node.x, y: node.y };
    }

    // Use first parentId if multiple parents exist
    const parentId = node.parentIds ? node.parentIds[0] : node.parentId;
    if (!parentId) return { x: node.x, y: node.y };

    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return { x: node.x, y: node.y };

    const siblings = nodes.filter(n => {
      const nParentId = n.parentIds ? n.parentIds[0] : n.parentId;
      return nParentId === parentId;
    });
    const index = siblings.findIndex(n => n.id === node.id);
    const parentPos = getNodePosition(parent);

    // Adjust spacing for circular nodes
    const spacing = node.type === 'main' ? 150 : node.type === 'sub' ? 130 : 110;
    return {
      x: parentPos.x + (index - 1) * spacing,
      y: parentPos.y + 120
    };
  };

  const renderConnections = () => {
    const connections = [];

    nodes.forEach(node => {
      // Support both single parentId and multiple parentIds
      const parentIds = node.parentIds || (node.parentId ? [node.parentId] : []);

      parentIds.forEach(parentId => {
        const parent = nodes.find(n => n.id === parentId);
        if (!parent) return;

        const parentPos = getNodePosition(parent);
        const nodePos = getNodePosition(node);

        // Calculate center of circular nodes
        const nodeSize = getNodeSizeForConnection(node);
        const parentSize = getNodeSizeForConnection(parent);

        connections.push(
          <line
            key={`line-${parentId}-${node.id}`}
            x1={parentPos.x + parentSize / 2}
            y1={parentPos.y + parentSize / 2}
            x2={nodePos.x + nodeSize / 2}
            y2={nodePos.y + nodeSize / 2}
            stroke="#cbd5e1"
            strokeWidth="2"
          />
        );
      });
    });

    return connections;
  };

  const getNodeSizeForConnection = (node) => {
    // Return diameter for circular nodes
    if (node.type === 'topic') return 140;
    if (node.type === 'main') return 120;
    if (node.type === 'sub') return 100;
    if (node.type === 'insight') return 80;
    if (node.type === 'opportunity') return 80;
    return 100;
  };

  const currentMetrics = creativityHistory.length > 0
    ? creativityHistory[creativityHistory.length - 1]
    : { creativity: 0, dependency: 0 };
  const currentCreativity = currentMetrics.creativity || (typeof currentMetrics === 'number' ? currentMetrics : 0);
  const currentDependency = currentMetrics.dependency || 0;

  const getPriorityColor = (impact, feasibility) => {
    const isHighImpact = impact > 5;
    const isHighFeasibility = feasibility > 5;

    if (isHighImpact && isHighFeasibility) return 'border-green-500 bg-green-50';
    if (isHighImpact && !isHighFeasibility) return 'border-yellow-500 bg-yellow-50';
    if (!isHighImpact && isHighFeasibility) return 'border-blue-500 bg-blue-50';
    return 'border-gray-300 bg-white';
  };

  const getCategoryColor = (category) => {
    const colors = [
      'bg-purple-100 text-purple-800',
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-pink-100 text-pink-800',
      'bg-orange-100 text-orange-800'
    ];
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  if (mode === 'structure') {
    const selectedNodes = nodes.filter(n => selectedForStructure.has(n.id));

    const getStructuredPosition = (node) => {
      if (!hierarchyAnalysis) return { x: 0, y: 0 };

      // Use grid position if node has been dragged
      if (structureGridPositions[node.id]) {
        return structureGridPositions[node.id];
      }

      // Use stored position if node has been positioned before
      if (node.structurePositioned && node.x !== undefined && node.y !== undefined) {
        return { x: node.x, y: node.y };
      }

      const analysis = hierarchyAnalysis.analysis.find(a => a.nodeId === node.id);
      if (!analysis) return { x: 0, y: 0 };

      // Position based on Impact (Y-axis) and Feasibility (X-axis)
      // Impact: 1-10 (low to high) → Y position (bottom to top)
      // Feasibility: 1-10 (low to high) → X position (left to right)

      const canvasWidth = 800;
      const canvasHeight = 600;
      const margin = 100;

      const x = margin + ((analysis.feasibility - 1) / 9) * (canvasWidth - 2 * margin);
      const y = canvasHeight - margin - ((analysis.impact - 1) / 9) * (canvasHeight - 2 * margin);

      return { x, y };
    };

    const renderStructureConnections = () => {
      if (!hierarchyAnalysis) return null;

      const connections = [];
      const priorityOrder = ['high', 'medium', 'low'];

      // Group nodes by priority
      const nodesByPriority = {};
      selectedNodes.forEach(node => {
        const analysis = hierarchyAnalysis.analysis.find(a => a.nodeId === node.id);
        if (analysis) {
          if (!nodesByPriority[analysis.priority]) {
            nodesByPriority[analysis.priority] = [];
          }
          nodesByPriority[analysis.priority].push(node);
        }
      });

      // Connect nodes from higher to lower priority hierarchy
      for (let i = 0; i < priorityOrder.length - 1; i++) {
        const currentPriority = priorityOrder[i];
        const nextPriority = priorityOrder[i + 1];

        const currentNodes = nodesByPriority[currentPriority] || [];
        const nextNodes = nodesByPriority[nextPriority] || [];

        currentNodes.forEach(parentNode => {
          nextNodes.forEach(childNode => {
            const parentPos = getStructuredPosition(parentNode);
            const childPos = getStructuredPosition(childNode);
            const parentAnalysis = hierarchyAnalysis.analysis.find(a => a.nodeId === parentNode.id);
            const size = getNodeSize(parentAnalysis?.impact || 5, parentAnalysis?.feasibility || 5);

            connections.push(
              <line
                key={`struct-${parentNode.id}-${childNode.id}`}
                x1={parentPos.x + size / 2}
                y1={parentPos.y + 70}
                x2={childPos.x + size / 2}
                y2={childPos.y}
                stroke="#9333ea"
                strokeWidth="2"
                opacity="0.4"
              />
            );
          });
        });
      }

      return connections;
    };

    const getNodeSize = (impact, feasibility) => {
      // All circles are the same small size
      return 16; // diameter in pixels
    };

    const getQuadrantLabel = (impact, feasibility) => {
      const isHighImpact = impact > 5;
      const isHighFeasibility = feasibility > 5;

      if (isHighImpact && isHighFeasibility) return 'Quick Wins';
      if (isHighImpact && !isHighFeasibility) return 'Big Bets';
      if (!isHighImpact && isHighFeasibility) return 'Fill-ins';
      return 'Maybe Later';
    };

    const getQuadrantColor = (impact, feasibility) => {
      const isHighImpact = impact > 5;
      const isHighFeasibility = feasibility > 5;

      if (isHighImpact && isHighFeasibility) return '#10b981';
      if (isHighImpact && !isHighFeasibility) return '#f59e0b';
      if (!isHighImpact && isHighFeasibility) return '#3b82f6';
      return '#9ca3af';
    };

    const getCategoryColor = (category) => {
      const colors = [
        'bg-purple-100 text-purple-800',
        'bg-blue-100 text-blue-800',
        'bg-green-100 text-green-800',
        'bg-pink-100 text-pink-800',
        'bg-orange-100 text-orange-800'
      ];
      const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return colors[hash % colors.length];
    };

    return (
      <div className="w-full h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex flex-col">
        <div className="bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-800">🏗️ Structure Mode</h1>
            <button
              onClick={() => setMode('exploration')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <ArrowLeft size={20} />
              Back to Exploration
            </button>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-gray-600">Impact-Feasibility Matrix</p>
            {hierarchyAnalysis && (
              <div className="flex gap-2">
                {hierarchyAnalysis.mainThemes.slice(0, 3).map((theme, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                    {theme}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          <div
            className="flex-1 overflow-auto relative"
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            {!hierarchyAnalysis ? (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                <p className="text-gray-400">Analyzing structure...</p>
              </div>
            ) : (
              <>
                {/* 2x2 Matrix Background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="relative" style={{ width: '800px', height: '600px' }}>
                    {/* Quadrants */}
                    <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-yellow-50 border-r-2 border-b-2 border-gray-300">
                      <div className="absolute top-2 left-2 text-xs font-semibold text-yellow-700">Big Bets</div>
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">High Impact, Low Feasibility</div>
                    </div>
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-50 border-l-2 border-b-2 border-gray-300">
                      <div className="absolute top-2 right-2 text-xs font-semibold text-green-700">Quick Wins</div>
                      <div className="absolute bottom-2 left-2 text-xs text-gray-400">High Impact, High Feasibility</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gray-50 border-r-2 border-t-2 border-gray-300">
                      <div className="absolute bottom-2 left-2 text-xs font-semibold text-gray-600">Maybe Later</div>
                      <div className="absolute top-2 right-2 text-xs text-gray-400">Low Impact, Low Feasibility</div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-50 border-l-2 border-t-2 border-gray-300">
                      <div className="absolute bottom-2 right-2 text-xs font-semibold text-blue-700">Fill-ins</div>
                      <div className="absolute top-2 left-2 text-xs text-gray-400">Low Impact, High Feasibility</div>
                    </div>

                    {/* Axis Labels */}
                    <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-700">
                      Impact →
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 text-sm font-semibold text-gray-700">
                      Feasibility →
                    </div>
                  </div>
                </div>

                <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
                  {renderStructureConnections()}
                </svg>

                {selectedNodes.map(node => {
                  const analysis = hierarchyAnalysis.analysis.find(a => a.nodeId === node.id);
                  if (!analysis) return null;

                  const pos = getStructuredPosition(node);
                  const size = getNodeSize(analysis.impact, analysis.feasibility);
                  const color = getQuadrantColor(analysis.impact, analysis.feasibility);
                  const isSelected = selectedStructureNode === node.id;

                  return (
                    <CircleNode
                      key={node.id}
                      node={node}
                      pos={pos}
                      size={size}
                      color={color}
                      isSelected={isSelected}
                      onSelect={() => setSelectedStructureNode(node.id)}
                    />
                  );
                })}
              </>
            )}
          </div>

          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-4">
            {!selectedStructureNode ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Lightbulb size={64} className="mb-4 opacity-30" />
                <p className="text-sm text-center">Select an idea to view details</p>
              </div>
            ) : (() => {
              const selectedNode = selectedNodes.find(n => n.id === selectedStructureNode);
              const analysis = hierarchyAnalysis?.analysis.find(a => a.nodeId === selectedStructureNode);

              if (!selectedNode || !analysis) return null;

              const isHighImpact = analysis.impact > 5;
              const isHighFeasibility = analysis.feasibility > 5;

              let quadrantLabel = 'Maybe Later';
              let quadrantColor = '#9ca3af';

              if (isHighImpact && isHighFeasibility) {
                quadrantLabel = 'Quick Wins';
                quadrantColor = '#10b981';
              } else if (isHighImpact && !isHighFeasibility) {
                quadrantLabel = 'Big Bets';
                quadrantColor = '#f59e0b';
              } else if (!isHighImpact && isHighFeasibility) {
                quadrantLabel = 'Fill-ins';
                quadrantColor = '#3b82f6';
              }

              return (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Lightbulb size={24} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-lg font-bold text-gray-800">Design Opportunity Details</h2>
                    </div>
                  </div>

                  {/* Idea Description */}
                  <div>
                    <p className="text-gray-700 leading-relaxed">{selectedNode.text}</p>
                  </div>

                  {/* Quadrant Badge */}
                  <div>
                    <span
                      className="inline-block px-4 py-2 rounded-full text-white font-semibold text-sm"
                      style={{ backgroundColor: quadrantColor }}
                    >
                      {quadrantLabel}
                    </span>
                  </div>

                  {/* Impact Score */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Impact Score</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${(analysis.impact / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-2xl font-bold text-gray-800 w-12 text-right">{analysis.impact.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Feasibility Score */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-600 mb-2">Feasibility Score</h3>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-purple-600 transition-all"
                          style={{ width: `${(analysis.feasibility / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-2xl font-bold text-gray-800 w-12 text-right">{analysis.feasibility.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Analysis Section */}
                  {analysis.analysis && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">ℹ</span>
                        </div>
                        <h3 className="font-semibold text-blue-900">Analysis</h3>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">{analysis.analysis}</p>
                    </div>
                  )}

                  {/* Recommended Action */}
                  {analysis.recommendedAction && (
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">⭐</span>
                        </div>
                        <h3 className="font-semibold text-green-900">Recommended Action</h3>
                      </div>
                      <p className="text-sm text-green-800 leading-relaxed">{analysis.recommendedAction}</p>
                    </div>
                  )}

                  {/* Category */}
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(analysis.category)}`}>
                      {analysis.category}
                    </span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {hierarchyAnalysis && (
          <div className="bg-white border-t p-4">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  <span className="font-semibold">{selectedNodes.length}</span> ideas structured across{' '}
                  <span className="font-semibold">{hierarchyAnalysis.mainThemes.length}</span> themes
                </div>
                <div className="flex gap-2">
                  {hierarchyAnalysis.mainThemes.slice(0, 4).map((theme, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                      {theme}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Creativity Report Page
  if (currentPage === 'report') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
        <div className="bg-white shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setCurrentPage('main')}
                  className="text-gray-600 hover:text-gray-800 text-sm flex items-center gap-1"
                >
                  <ArrowLeft size={16} />
                  Back to Canvas
                </button>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-800">Creativity Report</h1>
                <span className="text-yellow-500">★</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">Analyze your creative process using TTCT dimensions and track Human-AI collaboration patterns.</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-2 text-sm font-medium transition-colors ${activeTab === 'overview'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`px-6 py-2 text-sm font-medium transition-colors ${activeTab === 'timeline'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-gray-600 hover:text-gray-800'
                }`}
            >
              Timeline
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <p className="text-gray-600">Overview content will be displayed here.</p>
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Large Graph */}
              <div className="bg-gray-50 rounded-lg p-8 mb-6">
                <div className="relative h-96">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Grid lines */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={`grid-${y}`}
                        x1="5"
                        y1={5 + (y * 0.9)}
                        x2="95"
                        y2={5 + (y * 0.9)}
                        stroke="#e5e7eb"
                        strokeWidth="0.5"
                        strokeDasharray="2,2"
                      />
                    ))}

                    {/* Creativity line (green) */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 90 + 5;
                        const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                        const y = 5 + (1 - creativity) * 90;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 90 + 5;
                      const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                      const y = 5 + (1 - creativity) * 90;
                      return (
                        <g key={`creativity-detail-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                          <text
                            x={x}
                            y={y - 8}
                            fontSize="6"
                            fill="#10b981"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {Math.round(creativity * 100)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Dependency line (orange) */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 90 + 5;
                        const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                        const y = 5 + (1 - dependency) * 90;
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="3"
                      vectorEffect="non-scaling-stroke"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 90 + 5;
                      const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                      const y = 5 + (1 - dependency) * 90;
                      return (
                        <g key={`dependency-detail-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#f97316"
                            stroke="white"
                            strokeWidth="2"
                            vectorEffect="non-scaling-stroke"
                          />
                          <text
                            x={x}
                            y={y + 12}
                            fontSize="6"
                            fill="#f97316"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {Math.round(dependency * 100)}%
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Detailed Metrics */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-green-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Creativity Metrics</h3>
                  {creativityHistory.length > 0 && (() => {
                    const latest = creativityHistory[creativityHistory.length - 1];
                    const metrics = typeof latest === 'object' ? latest : { creativity: typeof latest === 'number' ? latest : 0 };
                    return (
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Fluency</span>
                            <span className="text-sm font-semibold">{Math.round((metrics.fluency || 0) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(metrics.fluency || 0) * 100}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Flexibility</span>
                            <span className="text-sm font-semibold">{Math.round((metrics.flexibility || 0) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(metrics.flexibility || 0) * 100}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Originality</span>
                            <span className="text-sm font-semibold">{Math.round((metrics.originality || 0) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(metrics.originality || 0) * 100}%` }}></div>
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-sm text-gray-600">Elaboration</span>
                            <span className="text-sm font-semibold">{Math.round((metrics.elaboration || 0) * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(metrics.elaboration || 0) * 100}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-orange-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Dependency Metrics</h3>
                  {creativityHistory.length > 0 && (() => {
                    const latest = creativityHistory[creativityHistory.length - 1];
                    const dependency = typeof latest === 'object' ? (latest.dependency || 0) : 0;
                    return (
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between mb-2">
                            <span className="text-sm text-gray-600">AI Dependency</span>
                            <span className="text-lg font-bold text-orange-600">{Math.round(dependency * 100)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div className="bg-orange-500 h-3 rounded-full" style={{ width: `${dependency * 100}%` }}></div>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {dependency > 0.7
                              ? "High dependency on AI. Consider incorporating more human input to improve originality."
                              : dependency > 0.4
                                ? "Balanced co-creation. Good mix of AI assistance and human creativity."
                                : "Low dependency. Strong human-driven creative process."}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* History Table */}
              <div className="bg-white rounded-lg border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 p-4 border-b border-gray-200">History</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">API Call</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Creativity</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Dependency</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Fluency</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Flexibility</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Originality</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Elaboration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {creativityHistory.map((metrics, index) => {
                        const m = typeof metrics === 'object' ? metrics : { creativity: typeof metrics === 'number' ? metrics : 0, dependency: 0 };
                        return (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm text-gray-700">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">{Math.round((m.creativity || 0) * 100)}%</td>
                            <td className="px-4 py-3 text-sm font-semibold text-orange-600">{Math.round((m.dependency || 0) * 100)}%</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{Math.round((m.fluency || 0) * 100)}%</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{Math.round((m.flexibility || 0) * 100)}%</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{Math.round((m.originality || 0) * 100)}%</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{Math.round((m.elaboration || 0) * 100)}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Landing Page
  if (showLandingPage) {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col items-center justify-center p-8">
        {/* Logo and Tagline */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-black mb-2">Nō AI</h1>
          <p className="text-xl text-black mb-1">LOGO</p>
          <p className="text-lg text-gray-700 mt-4 max-w-2xl">
            Transform your ideas into structured insights with AI-powered exploration.
          </p>
        </div>

        {/* Idea Input Section */}
        <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-3xl mb-12">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Type down your idea</h2>
          <textarea
            value={landingInputValue}
            onChange={(e) => setLandingInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && landingInputValue.trim()) {
                if (e.shiftKey) {
                  // Shift+Enter: new line
                  return;
                }
                e.preventDefault();
                handleStartExploration();
              }
            }}
            placeholder="Enter your creative concept, problem to solve, or topic to explore..."
            className="w-full px-4 py-4 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 resize-none mb-4 min-h-[120px] text-base"
            disabled={loading}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Press Enter to start</p>
            <button
              onClick={handleStartExploration}
              disabled={loading || !landingInputValue.trim()}
              className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-semibold text-lg transition-all shadow-lg"
            >
              {loading ? 'Starting...' : 'Start Exploration'}
              <ArrowRight size={20} />
            </button>
          </div>
        </div>

        {/* Features Section */}
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-800 mb-6">Features</h3>
          <div className="flex gap-12 justify-center">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-gray-700 font-medium">Semantic Graph</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span className="text-gray-700 font-medium">Reflection Panel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-700 font-medium">Creativity Report</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">💡 Exploration Mode</h1>
            {nodes.length > 0 && designTopic && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">Topic:</span>
                <span className="text-sm text-gray-700">{designTopic}</span>
              </div>
            )}
            {nodes.length > 0 && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-600">
                  Step {currentStep}/4:
                </span>
                <span className="text-sm text-gray-600">
                  {currentStep === 1 && 'Problem Framing'}
                  {currentStep === 2 && 'Sub-node Expansion'}
                  {currentStep === 3 && 'User Behavior Insights'}
                  {currentStep === 4 && 'Design Opportunities'}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {selectedForStructure.size > 0 && (
              <button
                onClick={analyzeHierarchy}
                disabled={analyzingStructure}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 font-semibold"
              >
                {analyzingStructure ? 'Analyzing...' : `Go to Structure Mode (${selectedForStructure.size} selected)`}
                <ArrowRight size={20} />
              </button>
            )}
            {nodes.length > 0 && (
              <button
                onClick={() => {
                  setNodes([]);
                  setReflections([]);
                  setCreativityHistory([]);
                  setEditCount(0);
                  setAiGenerationCount(0);
                  setSelectedForStructure(new Set());
                  setHierarchyAnalysis(null);
                  setCurrentStep(1);
                  setDesignTopic('');
                  setTopicNodeId(null);
                  setLandingInputValue('');
                  localStorage.removeItem('ideaTreeData');
                }}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div
          className="flex-1 overflow-auto relative"
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : 'default'
          }}
        >
          <svg className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {renderConnections()}
          </svg>

          {nodes.map(node => {
            const pos = getNodePosition(node);
            const isEditing = editingNode === node.id;
            const isSelected = selectedNode === node.id;
            const isFocused = focusedNode === node.id;
            const isSelectedForStructure = selectedForStructure.has(node.id);
            const isDragging = draggingNode === node.id;
            const isNodeHovered = hoveredNodeId === node.id;

            const nodeSize = node.type === 'topic' ? 140 : node.type === 'main' ? 120 : node.type === 'sub' ? 100 : node.type === 'insight' ? 80 : 80;
            const buttonRadius = (nodeSize / 2) + 25; // 버튼들이 노드 주변에 배치될 반경
            const hoverAreaSize = nodeSize + (buttonRadius * 2) + 20; // Hover 영역 확장

            return (
              <div
                key={node.id}
                ref={el => nodeRefs.current[node.id] = el}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                className="absolute"
                style={{
                  left: `${pos.x - (hoverAreaSize - nodeSize) / 2}px`,
                  top: `${pos.y - (hoverAreaSize - nodeSize) / 2}px`,
                  width: `${hoverAreaSize}px`,
                  height: `${hoverAreaSize}px`,
                  pointerEvents: isSpacePressed ? 'none' : 'auto'
                }}
              >
                {/* 노드 영역 - 드래그 가능 */}
                <div
                  onMouseDown={(e) => {
                    // 버튼 클릭 시 드래그 방지
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && target.tagName !== 'BUTTON') {
                      handleMouseDown(e, node);
                    }
                  }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${nodeSize}px`,
                    height: `${nodeSize}px`,
                    cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (isDragging ? 'grabbing' : 'grab'),
                    pointerEvents: 'auto'
                  }}
                >
                  {isEditing ? (
                    <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-blue-500">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full p-2 border rounded text-sm resize-none"
                        rows={3}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={handleEditSave}
                          className="flex-1 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNode(null)}
                          className="flex-1 px-2 py-1 bg-gray-400 text-white rounded text-xs hover:bg-gray-500"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`rounded-full shadow-md cursor-pointer hover:shadow-xl transition-all border-2 relative flex flex-col items-center justify-center ${isSelected ? 'scale-105 ring-2 ring-blue-400' : isFocused ? 'scale-110 shadow-2xl' : ''
                          } ${node.type === 'topic' ? 'bg-purple-100 border-purple-400' : node.type === 'main' ? 'bg-blue-50 border-blue-300' :
                            node.type === 'sub' ? 'bg-green-50 border-green-300' :
                              node.type === 'insight' ? 'bg-yellow-50 border-yellow-300' :
                                node.type === 'opportunity' ? 'bg-purple-50 border-purple-300' :
                                  'bg-white border-transparent'
                          } ${isSelectedForStructure ? 'border-purple-500' : ''}`}
                        style={{
                          transition: 'all 0.3s ease',
                          width: '100%',
                          height: '100%',
                          padding: node.type === 'topic' ? '14px' : node.type === 'main' ? '12px' : node.type === 'sub' ? '10px' : '8px'
                        }}
                      >
                        <div className="w-full h-full flex flex-col items-center justify-center relative">
                          {node.category && (
                            <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-600 bg-white shadow-sm border border-gray-200 whitespace-nowrap">
                              {node.category}
                            </span>
                          )}
                          <div
                            onClick={() => handleNodeClick(node)}
                            className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center"
                          >
                            <p className={`break-words ${node.type === 'topic' ? 'text-sm font-bold' : node.type === 'main' ? 'text-xs font-semibold' : 'text-xs'} text-gray-700 leading-tight`}>
                              {node.keyword || extractKeyword(node.text)}
                            </p>
                            {isSelected && (
                              <p className={`break-words mt-1 text-[10px] text-gray-600 leading-tight`}>
                                {node.text}
                              </p>
                            )}
                          </div>
                          <div
                            className="absolute -bottom-1 -right-1 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleNodeSelection(node.id);
                            }}
                          >
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer ${isSelectedForStructure ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
                              }`}>
                              {isSelectedForStructure && <Check size={10} className="text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* 버튼 영역 - hover 상태 유지 */}
                {isNodeHovered && !isEditing && (
                  <>
                    {/* Top-right: Generate (Zap) - 개별 노드 generate */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleGenerate(node);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(node.id)}
                      className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-green-300 flex items-center justify-center hover:bg-green-50 transition-colors z-20"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${buttonRadius * Math.cos(Math.PI * 0.25)}px), calc(-50% - ${buttonRadius * Math.sin(Math.PI * 0.25)}px))`,
                        pointerEvents: 'auto'
                      }}
                      title={node.type === 'topic' ? 'Topic Node' :
                        node.type === 'main' ? 'Expand to Sub-nodes' :
                          node.type === 'sub' ? 'Generate Insights' :
                            node.type === 'insight' ? 'Generate Opportunities' :
                              'Generate'}
                      disabled={loading}
                    >
                      <Zap size={14} className="text-green-600" />
                    </button>

                    {/* Top-right next to Generate: Multi-generate (여러 선택된 노드로부터 generate) */}
                    {selectedForStructure.size > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          const selectedNodesList = nodes.filter(n => selectedForStructure.has(n.id));
                          generateMultiSelection(selectedNodesList);
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onMouseEnter={() => setHoveredNodeId(node.id)}
                        onMouseLeave={() => setHoveredNodeId(node.id)}
                        className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-purple-300 flex items-center justify-center hover:bg-purple-50 transition-colors z-20"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: `translate(calc(-50% + ${buttonRadius * Math.cos(Math.PI * 0.15)}px), calc(-50% - ${buttonRadius * Math.sin(Math.PI * 0.15)}px))`,
                          pointerEvents: 'auto'
                        }}
                        title={`Generate from ${selectedForStructure.size} selected nodes`}
                        disabled={loading}
                      >
                        <Sparkles size={14} className="text-purple-600" />
                      </button>
                    )}

                    {/* Middle-right: Edit */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleEdit(node);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(node.id)}
                      className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-blue-300 flex items-center justify-center hover:bg-blue-50 transition-colors z-20"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${buttonRadius}px), calc(-50% + 0px))`,
                        pointerEvents: 'auto'
                      }}
                      title="Edit"
                    >
                      <Edit2 size={14} className="text-blue-600" />
                    </button>

                    {/* Bottom-right: Delete */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleDelete(node.id);
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(node.id)}
                      className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-red-300 flex items-center justify-center hover:bg-red-50 transition-colors z-20"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${buttonRadius * Math.cos(Math.PI * -0.25)}px), calc(-50% - ${buttonRadius * Math.sin(Math.PI * -0.25)}px))`,
                        pointerEvents: 'auto'
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} className="text-red-600" />
                    </button>

                    {/* Bottom-left: Add */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        // TODO: 새 노드 추가 기능 구현
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(node.id)}
                      className="absolute w-8 h-8 bg-white rounded-full shadow-lg border-2 border-gray-300 flex items-center justify-center hover:bg-gray-50 transition-colors z-20"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% - ${buttonRadius * Math.cos(Math.PI * 0.25)}px), calc(-50% + ${buttonRadius * Math.sin(Math.PI * 0.25)}px))`,
                        pointerEvents: 'auto'
                      }}
                      title="Add Node"
                    >
                      <Plus size={14} className="text-gray-600" />
                    </button>
                  </>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-6 py-4 rounded-lg shadow-xl">
              <p className="text-gray-700 font-semibold">Generating ideas...</p>
            </div>
          )}

          {mode === 'exploration' && nodes.length > 0 && (
            <div className="absolute bottom-6 right-[420px] w-[480px] z-[100] shadow-2xl bg-white rounded-lg" style={{ pointerEvents: 'auto' }}>
              <div
                onClick={() => setShowFullGraph(!showFullGraph)}
                className="bg-white rounded-lg shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow border border-gray-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">Creative Flow Timeline</h3>
                    <p className="text-xs text-gray-600 mt-1">Watch your creativity journey unfold! 🎨</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFullGraph(!showFullGraph);
                    }}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
                    title={showFullGraph ? 'Collapse' : 'Expand'}
                  >
                    {showFullGraph ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
                  </button>
                </div>
                <div className="border-t border-dotted border-blue-300 mb-3"></div>

                {!showFullGraph && (
                  <div className="relative h-32 bg-gray-50 rounded-lg p-4 mb-3">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Creativity line (green) */}
                      <polyline
                        points={creativityHistory.map((metrics, index) => {
                          const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                          const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                          const y = (1 - creativity) * 80 + 10;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                        const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                        const y = (1 - creativity) * 80 + 10;
                        return (
                          <circle
                            key={`creativity-${index}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}

                      {/* Dependency line (orange) */}
                      <polyline
                        points={creativityHistory.map((metrics, index) => {
                          const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                          const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                          const y = (1 - dependency) * 80 + 10;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                        const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                        const y = (1 - dependency) * 80 + 10;
                        return (
                          <circle
                            key={`dependency-${index}`}
                            cx={x}
                            cy={y}
                            r="3"
                            fill="#f97316"
                            stroke="white"
                            strokeWidth="1"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>
                  </div>
                )}

                {showFullGraph && (
                  <div className="relative h-48 bg-gray-50 rounded-lg p-4 mb-3">
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {/* Creativity line (green) */}
                      <polyline
                        points={creativityHistory.map((metrics, index) => {
                          const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                          const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                          const y = (1 - creativity) * 80 + 10;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      />
                      {creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                        const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                        const y = (1 - creativity) * 80 + 10;
                        return (
                          <circle
                            key={`creativity-${index}`}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}

                      {/* Dependency line (orange) */}
                      <polyline
                        points={creativityHistory.map((metrics, index) => {
                          const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                          const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                          const y = (1 - dependency) * 80 + 10;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth="2.5"
                        vectorEffect="non-scaling-stroke"
                      />
                      {creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 96 + 4;
                        const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                        const y = (1 - dependency) * 80 + 10;
                        return (
                          <circle
                            key={`dependency-${index}`}
                            cx={x}
                            cy={y}
                            r="3.5"
                            fill="#f97316"
                            stroke="white"
                            strokeWidth="1.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>
                  </div>
                )}

                {/* Legend and Metrics */}
                <div className="flex items-center justify-between mt-3 relative">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-green-500 rounded"></div>
                      <span className="text-xs text-gray-700">Creativity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-1 bg-orange-500 rounded"></div>
                      <span className="text-xs text-gray-700">Dependency</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm font-semibold text-gray-700">
                      <span className="text-green-500">↑</span>
                      <span>{Math.round(currentCreativity * 100)}%</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentPage('report');
                        setActiveTab('timeline');
                      }}
                      className="text-gray-400 hover:text-gray-600 p-1.5 rounded hover:bg-gray-100 transition-colors"
                      title="View Details"
                    >
                      <Maximize2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-4 relative">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="text-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-gray-800">Reflections</h2>
          </div>

          {reflections.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <Lightbulb size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Generate ideas to see reflections here</p>
            </div>
          ) : (
            <div className="space-y-3 pb-96">
              {reflections.map(reflection => (
                <div
                  key={reflection.id}
                  onClick={() => handleReflectionClick(reflection.nodeId)}
                  className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 shadow-sm border border-yellow-200 relative cursor-pointer hover:shadow-md transition-shadow"
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteReflection(reflection.id);
                    }}
                    className="absolute top-2 right-2 p-1 hover:bg-white rounded transition-colors"
                    title="Delete"
                  >
                    <X size={16} className="text-gray-500" />
                  </button>
                  <div className="mb-2">
                    <h3 className="font-semibold text-gray-800 text-sm mb-1 pr-6">
                      {reflection.topic}
                    </h3>
                    <p className="text-xs text-gray-500">{reflection.timestamp}</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    {reflection.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}