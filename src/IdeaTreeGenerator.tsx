/// <reference types="vite/client" />
import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Zap, X, Lightbulb, ArrowRight, ArrowLeft, Check, Maximize2, Star, Plus, Sparkles, RotateCcw, AlertCircle, ChevronRight, Home, LayoutGrid } from 'lucide-react';

// API URL: Use environment variable or fallback to localhost for development
// In Vercel deployment, use relative path '/api/anthropic' which maps to Vercel Functions
const API_URL = (import.meta as any).env?.VITE_API_URL || ((import.meta as any).env?.DEV ? 'http://localhost:3001/api/anthropic' : '/api/anthropic');

function CircleNode({ node, pos, size, color, isSelected, onSelect, onMouseDown, onClick = null }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="absolute"
      style={{
        left: `${pos.x - size / 2}px`,
        top: `${pos.y - size / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
        zIndex: isHovered || isSelected ? 10 : 2,
        cursor: onMouseDown ? 'move' : 'pointer'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => {
        if (onMouseDown) {
          onMouseDown(e, node);
        }
      }}
      onClick={(e) => {
        // If onClick prop is provided, use it (for structure mode)
        if (onClick) {
          onClick(e);
        } else if (onSelect && !onMouseDown) {
          // Otherwise, use onSelect if no onMouseDown
          onSelect();
        }
      }}
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
  const [currentPage, setCurrentPage] = useState('main'); // 'main' or 'report'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' or 'timeline'
  const [editCount, setEditCount] = useState(0);
  const [aiGenerationCount, setAiGenerationCount] = useState(0);
  const [selectedForStructure, setSelectedForStructure] = useState(new Set());
  const [hierarchyAnalysis, setHierarchyAnalysis] = useState(null);
  const [analyzingStructure, setAnalyzingStructure] = useState(false);
  const [structureReflections, setStructureReflections] = useState([]);
  const [focusedReflection, setFocusedReflection] = useState(null);
  const [expandedReflectionId, setExpandedReflectionId] = useState(null); // Track which reflection is expanded
  const [isReflectionSidebarOpen, setIsReflectionSidebarOpen] = useState(true); // Control reflection sidebar visibility
  const [isShiftPressed, setIsShiftPressed] = useState(false); // Track Shift key state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [structureGridPositions, setStructureGridPositions] = useState({});
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedStructureNode, setSelectedStructureNode] = useState(null);
  const [structureSelectedNodeIds, setStructureSelectedNodeIds] = useState(new Set()); // Store node IDs used for structure analysis
  const [currentStep, setCurrentStep] = useState(1); // Track current exploration step
  const [designTopic, setDesignTopic] = useState(''); // Store the initial design topic
  const [topicNodeId, setTopicNodeId] = useState(null); // Store the TOPIC node ID
  const [hoveredNodeId, setHoveredNodeId] = useState(null); // Track which node is hovered
  const nodeRefs = useRef({});
  const reflectionRefs = useRef({});
  const [animatingNodes, setAnimatingNodes] = useState(new Set()); // Track nodes that are animating

  // Helper function to add nodes with sequential animation
  const addNodesWithAnimation = (newNodes, delay = 300) => {
    newNodes.forEach((node, index) => {
      setTimeout(() => {
        setNodes(prev => {
          // Check if node already exists
          if (prev.find(n => n.id === node.id)) return prev;

          // Add node with animating flag
          const nodeWithAnimation = { ...node, isAnimating: true };
          const updated = [...prev, nodeWithAnimation];

          // Remove animating flag after animation completes
          setTimeout(() => {
            setNodes(current => current.map(n =>
              n.id === node.id ? { ...n, isAnimating: false } : n
            ));
            setAnimatingNodes(prev => {
              const next = new Set(prev);
              next.delete(node.id);
              return next;
            });
          }, 600); // Match animation duration

          setAnimatingNodes(prev => new Set(prev).add(node.id));
          return updated;
        });
      }, index * delay);
    });
  };

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
        // Restore structure selected node IDs if saved
        if (data.structureSelectedNodeIds && Array.isArray(data.structureSelectedNodeIds)) {
          setStructureSelectedNodeIds(new Set(data.structureSelectedNodeIds));
        } else if (data.hierarchyAnalysis && data.hierarchyAnalysis.analysis) {
          // Fallback: restore from hierarchyAnalysis if structureSelectedNodeIds not saved
          const nodeIds = new Set(data.hierarchyAnalysis.analysis.map(a => a.nodeId));
          setStructureSelectedNodeIds(nodeIds);
        } else {
          setStructureSelectedNodeIds(new Set());
        }
        // Restore structure grid positions if saved
        if (data.structureGridPositions && typeof data.structureGridPositions === 'object') {
          setStructureGridPositions(data.structureGridPositions);
        }

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

    // Keyboard event listeners for space bar panning and Shift key
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
      if (e.key === 'Shift' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // State to force re-render when returning to structure mode
  const [structureModeKey, setStructureModeKey] = useState(0);

  // Effect to force position recalculation when returning to structure mode
  // This ensures positions are recalculated after DOM is fully rendered
  useEffect(() => {
    if (mode === 'structure' && hierarchyAnalysis) {
      // Use a key-based approach to force re-render after DOM is ready
      const timeoutId = setTimeout(() => {
        // Increment key to force re-render of structure mode components
        setStructureModeKey(prev => prev + 1);
      }, 200); // Increased delay to ensure DOM is fully ready

      return () => clearTimeout(timeoutId);
    }
  }, [mode, hierarchyAnalysis]); // Run when mode or hierarchyAnalysis changes

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
      topicNodeId,
      structureSelectedNodeIds: Array.from(structureSelectedNodeIds),
      structureGridPositions
    };
    localStorage.setItem('ideaTreeData', JSON.stringify(dataToSave));
  }, [nodes, reflections, creativityHistory, editCount, aiGenerationCount, hierarchyAnalysis, structureReflections, currentStep, designTopic, topicNodeId, structureSelectedNodeIds]);

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

    // Ensure Creativity + Dependency = 100 (Dependency = 100 - Creativity)
    const normalizedCreativity = Math.max(0, Math.min(1, creativity));
    const normalizedDependency = 1 - normalizedCreativity; // Dependency = 100 - Creativity

    return {
      creativity: normalizedCreativity,
      dependency: normalizedDependency,
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

  // Get text to display based on node size (to prevent overflow)
  const getDisplayText = (text, nodeSize, isSelected) => {
    if (!text) return '';

    // 노드 크기에 따라 표시할 최대 글자 수 결정
    // 작은 노드일수록 더 짧게 자르기
    let maxLength;
    if (nodeSize <= 80) {
      // insight, opportunity 노드
      maxLength = isSelected ? 30 : 12;
    } else if (nodeSize <= 100) {
      // sub 노드
      maxLength = isSelected ? 40 : 15;
    } else if (nodeSize <= 120) {
      // main 노드
      maxLength = isSelected ? 50 : 20;
    } else {
      // topic 노드
      maxLength = isSelected ? 60 : 25;
    }

    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
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
      const response = await fetch(API_URL, {
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
    { "category": "Context", "text": "...", "keyword": "...", "critic": "...", "advice": "..." },
    { "category": "User", "text": "...", "keyword": "...", "critic": "...", "advice": "..." },
    { "category": "Task", "text": "...", "keyword": "...", "critic": "...", "advice": "..." },
    { "category": "Goal", "text": "...", "keyword": "...", "critic": "...", "advice": "..." }
  ]
}

Note: 
- "keyword" should be a concise 2–5 word phrase capturing the main meaning.
- "critic" (optional): Must be only ONE sentence under 18 words, and must be a short challenging question from a different perspective that provokes reflection (must end with "?"). Example critic patterns: questioning hidden causes, challenging assumptions, reconsidering boundaries. If no meaningful critic applies, omit this field.
- "advice" (optional): Must be only ONE sentence under 18 words, and must be a brief strategy-oriented suggestion that deepens or expands the idea. Example advice patterns: creative reframing strategies, gamification patterns, exploring cross-modal cues. Do not include solutions or implementation details. If no meaningful advice applies, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const newNodes = parsed.nodes.map((nodeObj, index) => {
        const nodeId = Date.now() + index * 10000 + Math.floor(Math.random() * 1000);

        // Create reflections if provided (critic, advice)
        const reflectionTypes = [
          { type: 'critic', data: nodeObj.critic },
          { type: 'advice', data: nodeObj.advice }
        ];

        reflectionTypes.forEach((refType, idx) => {
          if (refType.data && typeof refType.data === 'string' && refType.data.trim()) {
            setReflections(prev => [{
              id: nodeId + 10000 + idx,
              nodeId: nodeId,
              topic: nodeObj.text, // Keep node text for reference
              title: refType.data.trim(), // Use the reflection text as title
              content: refType.data.trim(), // Same content for display
              type: refType.type
            }, ...prev]);
          }
        });

        // Calculate initial position with collision detection during creation only
        const parentNode = nodes.find(n => n.id === parentTopicId);
        const parentPos = parentNode ? getNodePosition(parentNode) : { x: 400, y: 200 };
        const spacing = 150;
        const totalNodes = parsed.nodes.length;
        const centerOffset = (totalNodes - 1) * spacing / 2;
        const baseX = parentPos.x + (index * spacing) - centerOffset;
        const baseY = parentPos.y + 120;

        // Apply collision detection only during initial creation
        const nodeSize = 120; // main node size
        const allExistingNodes = nodes.filter(n => n.id !== nodeId);
        const adjustedPos = findNonCollidingPosition({ x: baseX, y: baseY }, nodeSize, allExistingNodes, nodeId);
        const initialX = adjustedPos.x;
        const initialY = adjustedPos.y;

        return {
          id: nodeId,
          text: nodeObj.text,
          keyword: nodeObj.keyword || extractKeyword(nodeObj.text),
          type: 'main',
          step: 1,
          category: nodeObj.category,
          parentId: parentTopicId, // Connect to TOPIC node
          x: initialX,
          y: initialY,
          level: 1,
          manuallyPositioned: false
        };
      });

      // Add nodes with sequential animation
      addNodesWithAnimation(newNodes, 300);
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
      const response = await fetch(API_URL, {
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
    { "text": "...", "keyword": "...", "critic": "...", "advice": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2–5 word phrase capturing the main meaning.
- "critic" (optional): Must be only ONE sentence under 18 words, and must be a short challenging question from a different perspective that provokes reflection (must end with "?"). Example critic patterns: questioning hidden causes, challenging assumptions, reconsidering boundaries. If no meaningful critic applies, omit this field.
- "advice" (optional): Must be only ONE sentence under 18 words, and must be a brief strategy-oriented suggestion that deepens or expands the idea. Example advice patterns: creative reframing strategies, gamification patterns, exploring cross-modal cues. Do not include solutions or implementation details. If no meaningful advice applies, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      // Get parent position (will be calculated by getNodePosition)
      const parentPos = getNodePosition(parentNode);
      const siblings = nodes.filter(n => n.parentId === parentNode.id);

      const newNodes = parsed.subNodes.map((subNodeObj, index) => {
        const nodeId = Date.now() + index * 10000 + Math.floor(Math.random() * 1000);

        // Create reflections if provided (critic, advice)
        const reflectionTypes = [
          { type: 'critic', data: subNodeObj.critic },
          { type: 'advice', data: subNodeObj.advice }
        ];

        reflectionTypes.forEach((refType, idx) => {
          if (refType.data && typeof refType.data === 'string' && refType.data.trim()) {
            setReflections(prev => [{
              id: nodeId + 10000 + idx,
              nodeId: nodeId,
              topic: subNodeObj.text, // Keep node text for reference
              title: refType.data.trim(), // Use the reflection text as title
              content: refType.data.trim(), // Same content for display
              type: refType.type
            }, ...prev]);
          }
        });

        // Calculate initial position with collision detection during creation only
        const spacing = 130;
        const siblingCount = parsed.subNodes.length;
        const centerOffset = (siblingCount - 1) * spacing / 2;
        const baseX = parentPos.x + (index * spacing) - centerOffset;
        const baseY = parentPos.y + 120;

        // Apply collision detection only during initial creation
        const nodeSize = 100; // sub node size
        const allExistingNodes = nodes.filter(n => n.id !== nodeId);
        const adjustedPos = findNonCollidingPosition({ x: baseX, y: baseY }, nodeSize, allExistingNodes, nodeId);
        const initialX = adjustedPos.x;
        const initialY = adjustedPos.y;

        return {
          id: nodeId,
          text: subNodeObj.text,
          keyword: subNodeObj.keyword || extractKeyword(subNodeObj.text),
          type: 'sub',
          step: 2,
          category: parentNode.category,
          parentId: parentNode.id,
          x: initialX,
          y: initialY,
          level: 1,
          manuallyPositioned: false
        };
      });

      // Add nodes with sequential animation
      addNodesWithAnimation(newNodes, 300);
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
      const response = await fetch(API_URL, {
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
    { "text": "...", "keyword": "...", "critic": "...", "advice": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2–5 word phrase capturing the main meaning.
- "critic" (optional): Must be only ONE sentence under 18 words, and must be a short challenging question from a different perspective that provokes reflection (must end with "?"). Example critic patterns: questioning hidden causes, challenging assumptions, reconsidering boundaries. If no meaningful critic applies, omit this field.
- "advice" (optional): Must be only ONE sentence under 18 words, and must be a brief strategy-oriented suggestion that deepens or expands the idea. Example advice patterns: creative reframing strategies, gamification patterns, exploring cross-modal cues. Do not include solutions or implementation details. If no meaningful advice applies, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      // Get parent position (will be calculated by getNodePosition)
      const parentPos = getNodePosition(parentNode);
      const siblingCount = parsed.insights.length;

      const newNodes = parsed.insights.map((insightObj, index) => {
        const nodeId = Date.now() + index * 10000 + Math.floor(Math.random() * 1000);

        // Create reflections if provided (critic, advice)
        const reflectionTypes = [
          { type: 'critic', data: insightObj.critic },
          { type: 'advice', data: insightObj.advice }
        ];

        reflectionTypes.forEach((refType, idx) => {
          if (refType.data && typeof refType.data === 'string' && refType.data.trim()) {
            setReflections(prev => [{
              id: nodeId + 10000 + idx,
              nodeId: nodeId,
              topic: insightObj.text, // Keep node text for reference
              title: refType.data.trim(), // Use the reflection text as title
              content: refType.data.trim(), // Same content for display
              type: refType.type
            }, ...prev]);
          }
        });

        // Calculate initial position (will be adjusted by getNodePosition for collision avoidance)
        // Calculate initial position with collision detection during creation only
        const spacing = 110;
        const centerOffset = (siblingCount - 1) * spacing / 2;
        const baseX = parentPos.x + (index * spacing) - centerOffset;
        const baseY = parentPos.y + 120;

        // Apply collision detection only during initial creation
        const nodeSize = 90; // insight node size
        const allExistingNodes = nodes.filter(n => n.id !== nodeId);
        const adjustedPos = findNonCollidingPosition({ x: baseX, y: baseY }, nodeSize, allExistingNodes, nodeId);
        const initialX = adjustedPos.x;
        const initialY = adjustedPos.y;

        return {
          id: nodeId,
          text: insightObj.text,
          keyword: insightObj.keyword || extractKeyword(insightObj.text),
          type: 'insight',
          step: 3,
          category: parentNode.category,
          parentId: parentNode.id,
          x: initialX,
          y: initialY,
          level: 2,
          manuallyPositioned: false
        };
      });

      // Add nodes with sequential animation
      addNodesWithAnimation(newNodes, 300);
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
      const response = await fetch(API_URL, {
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
    { "text": "Opportunity to...", "keyword": "...", "critic": "...", "advice": "..." },
    ... (1-3 items total)
  ]
}

Note: 
- "keyword" should be a concise 2–5 word phrase capturing the main meaning.
- "critic" (optional): Must be only ONE sentence under 18 words, and must be a short challenging question from a different perspective that provokes reflection (must end with "?"). Example critic patterns: questioning hidden causes, challenging assumptions, reconsidering boundaries. If no meaningful critic applies, omit this field.
- "advice" (optional): Must be only ONE sentence under 18 words, and must be a brief strategy-oriented suggestion that deepens or expands the idea. Example advice patterns: creative reframing strategies, gamification patterns, exploring cross-modal cues. Do not include solutions or implementation details. If no meaningful advice applies, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      // Get parent position (will be calculated by getNodePosition)
      const parentPos = getNodePosition(parentNode);
      const siblingCount = parsed.opportunities.length;

      const newNodes = parsed.opportunities.map((oppObj, index) => {
        const nodeId = Date.now() + index * 10000 + Math.floor(Math.random() * 1000);

        // Create reflections if provided (critic, advice)
        const reflectionTypes = [
          { type: 'critic', data: oppObj.critic },
          { type: 'advice', data: oppObj.advice }
        ];

        reflectionTypes.forEach((refType, idx) => {
          if (refType.data && typeof refType.data === 'string' && refType.data.trim()) {
            setReflections(prev => [{
              id: nodeId + 10000 + idx,
              nodeId: nodeId,
              topic: oppObj.text, // Keep node text for reference
              title: refType.data.trim(), // Use the reflection text as title
              content: refType.data.trim(), // Same content for display
              type: refType.type
            }, ...prev]);
          }
        });

        // Calculate initial position (will be adjusted by getNodePosition for collision avoidance)
        // Calculate initial position with collision detection during creation only
        const spacing = 100;
        const centerOffset = (siblingCount - 1) * spacing / 2;
        const baseX = parentPos.x + (index * spacing) - centerOffset;
        const baseY = parentPos.y + 120;

        // Apply collision detection only during initial creation
        const nodeSize = 80; // opportunity node size
        const allExistingNodes = nodes.filter(n => n.id !== nodeId);
        const adjustedPos = findNonCollidingPosition({ x: baseX, y: baseY }, nodeSize, allExistingNodes, nodeId);
        const initialX = adjustedPos.x;
        const initialY = adjustedPos.y;

        return {
          id: nodeId,
          text: oppObj.text,
          keyword: oppObj.keyword || extractKeyword(oppObj.text),
          type: 'opportunity',
          step: 4,
          category: parentNode.category,
          parentId: parentNode.id,
          x: initialX,
          y: initialY,
          level: 3,
          manuallyPositioned: false
        };
      });

      // Add nodes with sequential animation
      addNodesWithAnimation(newNodes, 300);

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

      const response = await fetch(API_URL, {
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
              content: `Analyze the following design opportunities using a comparative Impact–Feasibility evaluation framework. 
Your goal is to produce a meaningful distribution of ideas across different quadrants, avoiding clustering all ideas into the same region unless strictly justified.

Ideas:
${JSON.stringify(selectedNodesData, null, 2)}

===========================
EVALUATION PRINCIPLES
===========================

You MUST score ideas **relative to each other**, not independently.

Use the FULL 1–10 scale:
- 1–3 = low
- 4–6 = medium
- 7–10 = high

Avoid clustering:
- Do NOT place all ideas in the same quadrant.
- Variability in scores must come from **comparisons**, **penalties**, and **distinct strengths/weaknesses**.
- Do NOT use uniformly high scores (6–9). 
- Spread must feel natural and analytically justified, not artificially forced.

===========================
IMPACT SCORING LOGIC
===========================

Impact = user value × severity × relevance.

High impact (7–10) only if:
- Addresses a high-frequency, high-stakes, or deeply disruptive pain point.
- Provides substantial improvement to user experience or behavioral outcome.

Medium impact (4–6) if:
- Addresses a moderate or situational need.
- Contributes partially to solving the root issue.

Low impact (1–3) if ANY penalties apply:
- Idea is vague, generic, or overly broad.
- Poorly connected to a real user pain point.
- User group is underspecified.
- Outcome is low value or marginal improvement.
- Problem applies only in edge cases.

===========================
FEASIBILITY SCORING LOGIC
===========================

Feasibility = technical simplicity + resource load + coordination overhead.

High feasibility (7–10) only if:
- Low technical complexity.
- Minimal integration effort.
- Low operational cost.
- Clear path to execution.

Medium feasibility (4–6) if:
- Some uncertainty exists.
- Requires moderate integration or behavior adoption.

Low feasibility (1–3) if ANY penalties apply:
- Requires multi-organization coordination or complex infrastructure.
- Relies on volatile or hard-to-measure user behavior.
- Depends on missing data, unstable signals, or high privacy risk.
- High effort demanded from users or administrators.

===========================
DISTRIBUTION GUIDELINES
===========================

Do NOT force ideas into all four quadrants.

Instead:
- Ensure a realistic spread across quadrants.
- Prevent all ideas from collapsing into the same quadrant.
- Allow 0–2 empty quadrants if logically justified (e.g., theme-specific constraints).
- The distribution must emerge from the scoring logic—not arbitrary balancing.

The goal is **analytical differentiation**, not symmetry.

===========================
OUTPUT REQUIREMENTS
===========================

For each idea provide:
1. impact: number 1–10  
2. feasibility: number 1–10  
3. category: 1–4 word conceptual cluster  
4. insight: 1–2 concise sentences explaining the reasoning (problem-space only)  
5. recommendedAction: 1 sentence using quadrant logic explicitly:
   - Quick Wins → "prioritize"
   - Big Bets → "explore constraints or phased strategy"
   - Fill-ins → "address selectively when aligned"
   - Maybe Later → "defer or discard"

ALSO provide:
- mainThemes: 3–5 conceptual problem-space themes  
- relationships: 3–6 concise statements describing dependencies, contrasts, or overlaps  

Keep all text short, analytical, and avoid features, solutions, or technologies.

===========================
JSON-ONLY OUTPUT FORMAT
===========================

{
  "analysis": [
    {
      "nodeId": number,
      "impact": number,
      "feasibility": number,
      "category": "string",
      "insight": "string",
      "recommendedAction": "string"
    }
  ],
  "mainThemes": ["string", ...],
  "relationships": ["string", ...]
}`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

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

      // Pre-calculate initial positions for all nodes ONLY if this is a NEW structure analysis
      // Check if we already have positions for these nodes (preserving existing structure)
      const existingPositions = parsed.analysis.filter(analysis =>
        structureGridPositions[analysis.nodeId]
      );

      // Only calculate initial positions if this is a new structure (no existing positions)
      if (existingPositions.length === 0) {
        // Use setTimeout to ensure DOM is ready after mode change
        setTimeout(() => {
          const graphContainer = document.getElementById('structure-graph-container');
          if (graphContainer) {
            const graphWidth = 800;
            const graphHeight = 600;
            const margin = 100;
            const initialPositions = {};

            parsed.analysis.forEach(analysis => {
              const clampedFeasibility = Math.max(1, Math.min(10, analysis.feasibility || 5));
              const clampedImpact = Math.max(1, Math.min(10, analysis.impact || 5));

              // Calculate position within graph bounds (relative to graph container)
              const availableWidth = graphWidth - 2 * margin;
              const availableHeight = graphHeight - 2 * margin;

              const graphX = margin + ((clampedFeasibility - 1) / 9) * availableWidth;
              const graphY = (graphHeight - margin) - ((clampedImpact - 1) / 9) * availableHeight;

              // Clamp to graph bounds
              const clampedGraphX = Math.max(margin, Math.min(graphWidth - margin, graphX));
              const clampedGraphY = Math.max(margin, Math.min(graphHeight - margin, graphY));

              initialPositions[analysis.nodeId] = {
                x: clampedGraphX,
                y: clampedGraphY
              };
            });

            setStructureGridPositions(initialPositions);
          }
        }, 100);
      }
      // If positions already exist, they will be preserved and used in getStructuredPosition

      // Store selected node IDs for structure mode display (before clearing selection)
      setStructureSelectedNodeIds(new Set(selectedForStructure));

      // Clear selection after storing for structure mode
      setSelectedForStructure(new Set());
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

  const handleNodeClick = (node, e) => {
    if (editingNode === node.id) return;

    // Shift + Click: Toggle structure selection (toggle on/off)
    if (e && e.shiftKey) {
      toggleNodeSelection(node.id);
      // Also update selectedNode for visual feedback
      setSelectedNode(node.id);
      return;
    }

    // Normal click: clear multi-selection if active
    if (selectedForStructure.size > 0) {
      // Clear multi-selection completely (don't keep single selection for structure mode)
      setSelectedForStructure(new Set());
      setSelectedNode(node.id);
      return;
    }

    // Normal click: toggle single selection (no multi-selection active)
    // Also add to selectedForStructure so it counts as 1 selection for Structure Mode
    if (selectedNode === node.id) {
      // Deselecting
      setSelectedNode(null);
      setSelectedForStructure(new Set());
    } else {
      // Selecting
      setSelectedNode(node.id);
      setSelectedForStructure(new Set([node.id]));
    }
  };

  const handleEdit = (node) => {
    setEditingNode(node.id);
    setEditValue(node.text);
    setSelectedNode(null);
  };

  const handleEditSave = () => {
    setNodes(prev => prev.map(n =>
      n.id === editingNode ? { ...n, text: editValue, edited: true } : n
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

      const response = await fetch(API_URL, {
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

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

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
      const response = await fetch(API_URL, {
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
  "keyword": "...",
  "critic": "...",
  "advice": "..."
}

Note: 
- "keyword" should be a concise 2–5 word phrase capturing the main meaning.
- "critic" (optional): Must be only ONE sentence under 18 words, and must be a short challenging question from a different perspective that provokes reflection (must end with "?"). Example critic patterns: questioning hidden causes, challenging assumptions, reconsidering boundaries. If no meaningful critic applies, omit this field.
- "advice" (optional): Must be only ONE sentence under 18 words, and must be a brief strategy-oriented suggestion that deepens or expands the idea. Example advice patterns: creative reframing strategies, gamification patterns, exploring cross-modal cues. Do not include solutions or implementation details. If no meaningful advice applies, omit this field.`
            }
          ],
        })
      });

      const data = await response.json();

      // Check if response has error
      if (data.error) {
        console.error('API error:', data);
        alert(`API Error: ${data.error}${data.hint ? '\n' + data.hint : ''}`);
        setLoading(false);
        return;
      }

      // Check if response has content
      if (!data.content || !data.content[0] || !data.content[0].text) {
        console.error('Unexpected response format:', data);
        alert('Unexpected response format from API. Please check the console for details.');
        setLoading(false);
        return;
      }

      const text = data.content[0].text.trim();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);

      const existingMainNodes = nodes.filter(n => n.type === 'main' && n.step === 1);
      const nodeId = Date.now() + Math.floor(Math.random() * 10000);

      // Create reflections if provided (critic, advice)
      const reflectionTypes = [
        { type: 'critic', data: parsed.critic },
        { type: 'advice', data: parsed.advice }
      ];

      reflectionTypes.forEach((refType, idx) => {
        if (refType.data && typeof refType.data === 'string' && refType.data.trim()) {
          setReflections(prev => [{
            id: nodeId + 10000 + idx,
            nodeId: nodeId,
            topic: parsed.text, // Keep node text for reference
            title: refType.data.trim(), // Use the reflection text as title
            content: refType.data.trim(), // Same content for display
            type: refType.type
          }, ...prev]);
        }
      });

      // Calculate initial position (will be adjusted by getNodePosition during rendering for collision avoidance)
      // For main nodes, position them relative to existing main nodes or center
      const topicNode = nodes.find(n => n.type === 'topic');
      const topicPos = topicNode ? getNodePosition(topicNode) : { x: 400, y: 200 };
      const spacing = 150;
      const centerOffset = (existingMainNodes.length * spacing) / 2;
      const initialX = topicPos.x + (existingMainNodes.length * spacing) - centerOffset;
      const initialY = topicPos.y + 120;

      const newNode = {
        id: nodeId,
        text: parsed.text,
        keyword: parsed.keyword || extractKeyword(parsed.text),
        type: 'main',
        step: 1,
        category: category,
        parentId: topicNode?.id || null,
        x: initialX,
        y: initialY,
        level: 0,
        manuallyPositioned: false
      };

      // Add node with animation
      addNodesWithAnimation([newNode], 0);
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

  const handleHome = () => {
    // Reset all data and return to landing page
    setNodes([]);
    setReflections([]);
    setCreativityHistory([]);
    setEditCount(0);
    setAiGenerationCount(0);
    setSelectedForStructure(new Set());
    setStructureSelectedNodeIds(new Set());
    setHierarchyAnalysis(null);
    setCurrentStep(1);
    setDesignTopic('');
    setTopicNodeId(null);
    setLandingInputValue('');
    setMode('exploration');
    localStorage.removeItem('ideaTreeData');
  };

  const handleExpandAll = async () => {
    // Find all leaf nodes (nodes with no children)
    const leafNodes = nodes.filter(node => {
      const hasChildren = nodes.some(n => {
        const nParentId = n.parentIds ? n.parentIds[0] : n.parentId;
        return nParentId === node.id;
      });
      return !hasChildren;
    });

    if (leafNodes.length === 0) {
      alert('No leaf nodes found to expand.');
      return;
    }

    setLoading(true);
    try {
      // Generate for each leaf node based on its type
      for (const node of leafNodes) {
        if (node.type === 'main' && node.step === 1) {
          await generateStep2SubNodes(node);
        } else if (node.type === 'sub' && node.step === 2) {
          await generateStep3Insights(node);
        } else if (node.type === 'insight' && node.step === 3) {
          await generateStep4Opportunities(node);
        }
        // Add small delay between generations to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (err) {
      console.error('Expand all error:', err);
      alert('An error occurred while expanding nodes.');
    }
    setLoading(false);
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

  const handleReflectionClick = (reflectionId, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    // Toggle expand state
    setExpandedReflectionId(prev => prev === reflectionId ? null : reflectionId);

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

    // Store mouse down position to detect if it's a click or drag
    setMouseDownPos({ x: e.clientX, y: e.clientY });

    if (isSpacePressed) {
      // Start panning - find the canvas container
      const container = e.target.closest('.flex-1.overflow-auto.relative') ||
        document.querySelector('.flex-1.overflow-auto.relative');
      if (container) {
        setIsPanning(true);
        setPanStart({
          x: e.clientX + container.scrollLeft,
          y: e.clientY + container.scrollTop
        });
      }
    } else {
      // Start dragging node
      // Find the canvas container (the one with overflow-auto)
      const container = e.target.closest('.flex-1.overflow-auto.relative') ||
        document.querySelector('.flex-1.overflow-auto.relative');

      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const nodePos = getNodePosition(node);

      // Calculate offset from node center to mouse position
      const mouseX = e.clientX - containerRect.left + container.scrollLeft;
      const mouseY = e.clientY - containerRect.top + container.scrollTop;

      setDraggingNode(node.id);
      setDragOffset({
        x: mouseX - nodePos.x,
        y: mouseY - nodePos.y
      });
    }
    e.preventDefault();
    e.stopPropagation();
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
    const containerRect = container.getBoundingClientRect();
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;

    // Calculate new position based on mouse position and offset
    const mouseX = e.clientX - containerRect.left + scrollLeft;
    const mouseY = e.clientY - containerRect.top + scrollTop;

    if (mode === 'structure') {
      // Convert screen position to graph position (within graph bounds)
      const graphContainer = document.getElementById('structure-graph-container');
      if (!graphContainer) return;

      const graphRect = graphContainer.getBoundingClientRect();
      const graphWidth = 800;
      const graphHeight = 600;
      const margin = 100;
      const nodeRadius = 8;

      // Calculate new node center position in screen coordinates
      // offset was calculated as: e.clientX - nodeCenterX, so nodeCenterX = e.clientX - offset
      const nodeCenterScreenX = e.clientX - dragOffset.x;
      const nodeCenterScreenY = e.clientY - dragOffset.y;

      // Convert screen coordinates to graph container relative coordinates
      const graphRelativeX = nodeCenterScreenX - graphRect.left;
      const graphRelativeY = nodeCenterScreenY - graphRect.top;

      // Clamp to graph bounds
      const clampedX = Math.max(margin, Math.min(graphWidth - margin, graphRelativeX));
      const clampedY = Math.max(margin, Math.min(graphHeight - margin, graphRelativeY));

      // Convert position to impact and feasibility scores (1-10)
      const availableWidth = graphWidth - 2 * margin;
      const availableHeight = graphHeight - 2 * margin;

      // Feasibility: x position → 1 (left) to 10 (right)
      const feasibility = 1 + ((clampedX - margin) / availableWidth) * 9;

      // Impact: y position → 10 (top) to 1 (bottom)
      const impact = 10 - ((clampedY - margin) / availableHeight) * 9;

      // Round to 1 decimal place and clamp to 1-10
      const roundedFeasibility = Math.max(1, Math.min(10, Math.round(feasibility * 10) / 10));
      const roundedImpact = Math.max(1, Math.min(10, Math.round(impact * 10) / 10));

      // Update hierarchyAnalysis with new impact and feasibility values
      if (hierarchyAnalysis) {
        setHierarchyAnalysis(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            analysis: prev.analysis.map(a =>
              a.nodeId === draggingNode
                ? { ...a, impact: roundedImpact, feasibility: roundedFeasibility }
                : a
            )
          };
        });
      }

      // Store the position (relative to graph container)
      setStructureGridPositions(prev => ({
        ...prev,
        [draggingNode]: { x: clampedX, y: clampedY }
      }));

      setNodes(prev => prev.map(n =>
        n.id === draggingNode
          ? { ...n, x: clampedX, y: clampedY, structurePositioned: true, structureAdjusted: true }
          : n
      ));
      return; // Early return for structure mode
    }

    // Exploration mode: use container-relative coordinates
    const newX = mouseX - dragOffset.x;
    const newY = mouseY - dragOffset.y;

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
  };

  const handleMouseUp = (e) => {
    // Check if it was a click (not a drag) in structure mode
    if (draggingNode && mode === 'structure') {
      const movedDistance = Math.sqrt(
        Math.pow((e?.clientX || mouseDownPos.x) - mouseDownPos.x, 2) +
        Math.pow((e?.clientY || mouseDownPos.y) - mouseDownPos.y, 2)
      );
      // If moved less than 5px, treat it as a click and select the node
      if (movedDistance < 5) {
        setSelectedStructureNode(draggingNode);
      }
    }

    setDraggingNode(null);
    setIsPanning(false);
    setMouseDownPos({ x: 0, y: 0 });
  };

  // Helper function to check if two nodes overlap
  const checkNodeCollision = (pos1, size1, pos2, size2, minDistance = 20) => {
    const distance = Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
    const minRequiredDistance = (size1 / 2) + (size2 / 2) + minDistance;
    return distance < minRequiredDistance;
  };

  // Helper function to find a non-colliding position using spiral search
  const findNonCollidingPosition = (initialPos, nodeSize, existingNodes, excludedNodeId = null) => {
    let currentPos = { ...initialPos };
    let spiralRadius = 0;
    let angle = 0;
    const maxAttempts = 100;
    let attempts = 0;
    const minDistance = 20;

    // Get node size function for other nodes
    const getOtherNodeSize = (otherNode) => {
      if (otherNode.type === 'topic') return 140;
      if (otherNode.type === 'main') return 120;
      if (otherNode.type === 'sub') return 100;
      if (otherNode.type === 'insight') return 90;
      return 80; // opportunity or default
    };

    // Helper to get node position directly from stored values (avoid recursion)
    const getStoredNodePosition = (otherNode) => {
      if (!otherNode) return { x: 400, y: 300 };
      // Use stored position if available, otherwise calculate from parent
      if (otherNode.manuallyPositioned && otherNode.x !== undefined && otherNode.y !== undefined) {
        return { x: otherNode.x, y: otherNode.y };
      }
      if (otherNode.x !== undefined && otherNode.y !== undefined) {
        return { x: otherNode.x, y: otherNode.y };
      }
      // Fallback: calculate from parent if parent exists
      const parentId = otherNode.parentIds ? otherNode.parentIds[0] : otherNode.parentId;
      if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent) {
          const parentPos = getStoredNodePosition(parent);
          const spacing = otherNode.type === 'main' ? 150 : otherNode.type === 'sub' ? 130 : 110;
          const siblings = nodes.filter(n => {
            const nParentId = n.parentIds ? n.parentIds[0] : n.parentId;
            return nParentId === parentId;
          });
          const index = siblings.findIndex(n => n.id === otherNode.id);
          return {
            x: parentPos.x + (index - 1) * spacing,
            y: parentPos.y + 120
          };
        }
      }
      return { x: otherNode.x || 400, y: otherNode.y || 300 };
    };

    while (attempts < maxAttempts) {
      let hasCollision = false;

      // Check collision with all existing nodes
      for (const otherNode of existingNodes) {
        if (excludedNodeId && otherNode.id === excludedNodeId) continue;

        // Use stored position directly to avoid recursion
        const otherNodePos = getStoredNodePosition(otherNode);
        const otherNodeSize = getOtherNodeSize(otherNode);

        if (checkNodeCollision(currentPos, nodeSize, otherNodePos, otherNodeSize, minDistance)) {
          hasCollision = true;
          break;
        }
      }

      if (!hasCollision) {
        return currentPos;
      }

      // Spiral search: increase radius and angle
      attempts++;
      if (attempts % 8 === 0) {
        spiralRadius += 30;
        angle = 0;
      } else {
        angle += Math.PI / 4; // 45 degrees
      }

      currentPos = {
        x: initialPos.x + spiralRadius * Math.cos(angle),
        y: initialPos.y + spiralRadius * Math.sin(angle)
      };
    }

    // If no position found, return a position far away
    return {
      x: initialPos.x + 500,
      y: initialPos.y + 500
    };
  };

  const getNodePosition = (node) => {
    // Safety check: if node is undefined or null, return default position
    if (!node) {
      return { x: 400, y: 300 };
    }

    // If node has been manually positioned (dragged), use that position
    if (node.manuallyPositioned) {
      return { x: node.x, y: node.y };
    }

    // Use first parentId if multiple parents exist
    const parentId = node.parentIds ? node.parentIds[0] : node.parentId;
    if (!parentId) return { x: node.x || 400, y: node.y || 300 };

    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return { x: node.x || 400, y: node.y || 300 };

    const siblings = nodes.filter(n => {
      const nParentId = n.parentIds ? n.parentIds[0] : n.parentId;
      return nParentId === parentId;
    });
    const index = siblings.findIndex(n => n.id === node.id);
    const parentPos = getNodePosition(parent);

    // Adjust spacing for circular nodes
    const spacing = node.type === 'main' ? 150 : node.type === 'sub' ? 130 : 110;
    const basePosition = {
      x: parentPos.x + (index - 1) * spacing,
      y: parentPos.y + 120
    };

    // If node already has a position set, use it (no collision detection after initial creation)
    // Collision detection only happens during initial node creation, not during rendering or drag
    if (node.x !== undefined && node.y !== undefined) {
      return { x: node.x, y: node.y };
    }

    // This should not happen in normal flow, but return base position as fallback
    return basePosition;
  };

  const renderConnections = () => {
    const connections = [];
    const hasMultiSelection = selectedForStructure.size > 1;
    const selectedNodeIds = new Set(selectedForStructure);

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

        // Check if this connection is between selected nodes
        const isSelectedConnection = hasMultiSelection &&
          (selectedNodeIds.has(parentId) && selectedNodeIds.has(node.id));

        // Check if this is a new connection (node is animating)
        const isNewConnection = node.isAnimating || animatingNodes.has(node.id);

        connections.push(
          <line
            key={`line-${parentId}-${node.id}`}
            x1={parentPos.x + parentSize / 2}
            y1={parentPos.y + parentSize / 2}
            x2={nodePos.x + nodeSize / 2}
            y2={nodePos.y + nodeSize / 2}
            stroke={isSelectedConnection ? "url(#multiSelectGradient)" : "#cbd5e1"}
            strokeWidth={isSelectedConnection ? "3" : "2"}
            className={isNewConnection ? "line-draw" : ""}
            style={{
              transition: isNewConnection ? 'none' : 'all 0.4s ease-out',
              filter: isSelectedConnection ? 'drop-shadow(0 0 3px rgba(168, 85, 247, 0.5))' : 'none'
            }}
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
    // Use stored node IDs from structure analysis, not current selection
    const selectedNodes = nodes.filter(n => structureSelectedNodeIds.has(n.id));

    const getStructuredPosition = (node) => {
      if (!hierarchyAnalysis) return { x: 0, y: 0 };

      // Helper function to calculate offset from graph container to parent container
      const calculateOffset = () => {
        const graphContainer = document.getElementById('structure-graph-container');
        if (!graphContainer) return { x: 0, y: 0 };

        // Get the parent container (the .overflow-auto div)
        const parentContainer = graphContainer.closest('.overflow-auto');
        if (parentContainer) {
          const parentRect = parentContainer.getBoundingClientRect();
          const graphRect = graphContainer.getBoundingClientRect();
          // Calculate offset considering scroll position
          const scrollLeft = parentContainer.scrollLeft || 0;
          const scrollTop = parentContainer.scrollTop || 0;
          return {
            x: (graphRect.left - parentRect.left) + scrollLeft,
            y: (graphRect.top - parentRect.top) + scrollTop
          };
        }
        // Fallback: try parentElement
        if (graphContainer.parentElement) {
          const parentRect = graphContainer.parentElement.getBoundingClientRect();
          const graphRect = graphContainer.getBoundingClientRect();
          return {
            x: graphRect.left - parentRect.left,
            y: graphRect.top - parentRect.top
          };
        }
        return { x: 0, y: 0 };
      };

      // Priority 1: Use grid position if it exists (preserves user-adjusted or initial positions)
      if (structureGridPositions[node.id]) {
        // structureGridPositions stores graph-relative coordinates
        // Convert to parent container coordinates by adding offset
        const offset = calculateOffset();
        return {
          x: structureGridPositions[node.id].x + offset.x,
          y: structureGridPositions[node.id].y + offset.y
        };
      }

      // Priority 2: Use stored position if node has been positioned before
      if (node.structurePositioned && node.x !== undefined && node.y !== undefined) {
        const offset = calculateOffset();
        return {
          x: node.x + offset.x,
          y: node.y + offset.y
        };
      }

      const analysis = hierarchyAnalysis.analysis.find(a => a.nodeId === node.id);
      if (!analysis) return { x: 0, y: 0 };

      // Position based on Impact (Y-axis) and Feasibility (X-axis)
      const graphWidth = 800;
      const graphHeight = 600;
      const nodeRadius = 8;
      const margin = 100; // Match the margin used in grid rendering

      // Clamp values to 1-10 range
      const clampedFeasibility = Math.max(1, Math.min(10, analysis.feasibility || 5));
      const clampedImpact = Math.max(1, Math.min(10, analysis.impact || 5));

      // Calculate position within graph bounds (relative to graph container)
      // X-axis: feasibility maps from left (1) to right (10)
      const availableWidth = graphWidth - 2 * margin;
      const graphX = margin + ((clampedFeasibility - 1) / 9) * availableWidth;

      // Y-axis: impact maps from bottom (1) to top (10)
      const availableHeight = graphHeight - 2 * margin;
      const graphY = (graphHeight - margin) - ((clampedImpact - 1) / 9) * availableHeight;

      // Clamp to graph bounds (graph-relative coordinates)
      const clampedGraphX = Math.max(margin, Math.min(graphWidth - margin, graphX));
      const clampedGraphY = Math.max(margin, Math.min(graphHeight - margin, graphY));

      // Convert graph-relative coordinates to parent container coordinates
      // Use the same offset calculation helper
      const offset = calculateOffset();
      return {
        x: clampedGraphX + offset.x,
        y: clampedGraphY + offset.y
      };
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
            {analyzingStructure || !hierarchyAnalysis ? (
              <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 min-w-[200px]">
                  <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
                  <p className="text-gray-700 font-semibold text-lg">Analyzing structure...</p>
                  <p className="text-gray-500 text-sm">Please wait</p>
                </div>
              </div>
            ) : (
              <>
                {/* 2x2 Matrix Background */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div id="structure-graph-container" className="relative" style={{ width: '800px', height: '600px' }}>
                    {/* Quadrants - Background layer */}
                    <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-yellow-50 border-r-2 border-b-2 border-gray-300" style={{ zIndex: 0 }}>
                      <div className="absolute top-2 left-2 text-xs font-semibold text-yellow-700">Big Bets</div>
                      <div className="absolute bottom-2 right-2 text-xs text-gray-400">High Impact, Low Feasibility</div>
                    </div>
                    <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-green-50 border-l-2 border-b-2 border-gray-300" style={{ zIndex: 0 }}>
                      <div className="absolute top-2 right-2 text-xs font-semibold text-green-700">Quick Wins</div>
                      <div className="absolute bottom-2 left-2 text-xs text-gray-400">High Impact, High Feasibility</div>
                    </div>
                    <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gray-50 border-r-2 border-t-2 border-gray-300" style={{ zIndex: 0 }}>
                      <div className="absolute bottom-2 left-2 text-xs font-semibold text-gray-600">Maybe Later</div>
                      <div className="absolute top-2 right-2 text-xs text-gray-400">Low Impact, Low Feasibility</div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-blue-50 border-l-2 border-t-2 border-gray-300" style={{ zIndex: 0 }}>
                      <div className="absolute bottom-2 right-2 text-xs font-semibold text-blue-700">Fill-ins</div>
                      <div className="absolute top-2 left-2 text-xs text-gray-400">Low Impact, High Feasibility</div>
                    </div>

                    {/* Grid Lines and Score Labels - Overlay on top of quadrants */}
                    <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 1, width: '800px', height: '600px' }}>
                      {/* Vertical grid lines (Feasibility: 1-10) */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                        const graphWidth = 800;
                        const graphHeight = 600;
                        const margin = 100;
                        const availableWidth = graphWidth - 2 * margin;
                        const x = margin + ((score - 1) / 9) * availableWidth;
                        return (
                          <g key={`v-${score}`}>
                            <line
                              x1={x}
                              y1={0}
                              x2={x}
                              y2={graphHeight}
                              stroke="#e2e8f0"
                              strokeWidth={1}
                              strokeDasharray="4,4"
                            />
                            {/* Show score labels for odd numbers (1, 3, 5, 7, 9) and also 10 */}
                            {(score % 2 === 1 || score === 10) && (
                              <text
                                x={x}
                                y={graphHeight + 25}
                                textAnchor="middle"
                                className="text-xs fill-gray-600 font-medium"
                              >
                                {score}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      {/* Horizontal grid lines (Impact: 1-10) */}
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(score => {
                        const graphWidth = 800;
                        const graphHeight = 600;
                        const margin = 100;
                        const availableHeight = graphHeight - 2 * margin;
                        const y = (graphHeight - margin) - ((score - 1) / 9) * availableHeight;
                        return (
                          <g key={`h-${score}`}>
                            <line
                              x1={0}
                              y1={y}
                              x2={graphWidth}
                              y2={y}
                              stroke="#e2e8f0"
                              strokeWidth={1}
                              strokeDasharray="4,4"
                            />
                            {/* Show score labels for odd numbers (1, 3, 5, 7, 9) and also 10 */}
                            {(score % 2 === 1 || score === 10) && (
                              <text
                                x={-20}
                                y={y + 4}
                                textAnchor="middle"
                                className="text-xs fill-gray-600 font-medium"
                              >
                                {score}
                              </text>
                            )}
                          </g>
                        );
                      })}
                    </svg>

                    {/* Axis Labels */}
                    <div className="absolute -left-16 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm font-semibold text-gray-700" style={{ zIndex: 2 }}>
                      Impact →
                    </div>
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-8 text-sm font-semibold text-gray-700" style={{ zIndex: 2 }}>
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
                      key={`${node.id}-${structureModeKey}`}
                      node={node}
                      pos={pos}
                      size={size}
                      color={color}
                      isSelected={isSelected}
                      onSelect={() => setSelectedStructureNode(node.id)}
                      onMouseDown={(e, node) => {
                        // Structure mode: enable dragging and select the node
                        e.preventDefault();
                        e.stopPropagation();

                        // Select the node immediately when mouse down (for info display)
                        setSelectedStructureNode(node.id);

                        // Get the actual rendered position of the node (screen coordinates)
                        // Use the actual DOM element's position, not the calculated position
                        const nodeElement = e.currentTarget;
                        const nodeRect = nodeElement.getBoundingClientRect();
                        const nodeCenterX = nodeRect.left + nodeRect.width / 2;
                        const nodeCenterY = nodeRect.top + nodeRect.height / 2;

                        // Calculate offset from actual rendered node center to mouse position
                        // This ensures drag starts from where the node is actually displayed
                        const offsetX = e.clientX - nodeCenterX;
                        const offsetY = e.clientY - nodeCenterY;

                        // Also update the structureGridPositions to match the actual rendered position
                        // This ensures future drags start from the correct position
                        const graphContainer = document.getElementById('structure-graph-container');
                        if (graphContainer) {
                          const graphRect = graphContainer.getBoundingClientRect();
                          // Convert screen coordinates to graph container relative coordinates
                          const graphRelativeX = nodeCenterX - graphRect.left;
                          const graphRelativeY = nodeCenterY - graphRect.top;

                          // CRITICAL: Update structureGridPositions with the ACTUAL rendered position
                          // This ensures getStructuredPosition will use the correct position next render
                          setStructureGridPositions(prev => ({
                            ...prev,
                            [node.id]: { x: graphRelativeX, y: graphRelativeY }
                          }));

                          // Also update the node's stored position to match the actual rendered position
                          setNodes(prev => prev.map(n =>
                            n.id === node.id
                              ? { ...n, x: graphRelativeX, y: graphRelativeY, structurePositioned: true }
                              : n
                          ));
                        }

                        setDragOffset({ x: offsetX, y: offsetY });
                        setDraggingNode(node.id);
                        setMouseDownPos({ x: e.clientX, y: e.clientY });
                      }}
                      onClick={(e) => {
                        // Also handle click for selection (backup in case onMouseDown doesn't fire)
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedStructureNode(node.id);
                      }}
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

                  {/* Insight Section */}
                  {analysis.insight && (
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">ℹ</span>
                        </div>
                        <h3 className="font-semibold text-blue-900">Insight</h3>
                      </div>
                      <p className="text-sm text-blue-800 leading-relaxed">{analysis.insight}</p>
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
          {activeTab === 'overview' && (() => {
            // Calculate comprehensive TTCT scores for AI vs Human
            const calculateTTCTScores = (nodeList) => {
              if (nodeList.length === 0) {
                return { fluency: 0, flexibility: 0, originality: 0, elaboration: 0 };
              }

              // Fluency: number of ideas (normalized)
              const maxExpectedNodes = 100;
              const fluency = Math.min(nodeList.length / maxExpectedNodes, 1);

              // Flexibility: variety of categories
              const uniqueTypes = new Set(nodeList.map(n => n.type));
              const flexibility = uniqueTypes.size / 4; // max 4 types

              // Originality: novelty (semantic similarity)
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
              for (let i = 0; i < nodeList.length; i++) {
                for (let j = i + 1; j < nodeList.length; j++) {
                  totalSimilarity += calculateSimilarity(nodeList[i].text, nodeList[j].text);
                  comparisonCount++;
                }
              }
              const avgSimilarity = comparisonCount > 0 ? totalSimilarity / comparisonCount : 0;
              const originality = 1 - avgSimilarity;

              // Elaboration: depth and linkage
              const edges = nodeList.filter(n => n.parentId || (n.parentIds && n.parentIds.length > 0)).length;
              const density = nodeList.length > 0 ? edges / nodeList.length : 0;
              const avgLength = nodeList.length > 0
                ? nodeList.reduce((sum, n) => sum + (n.text?.length || 0), 0) / nodeList.length
                : 0;
              const maxExpectedLength = 100;
              const lengthScore = Math.min(avgLength / maxExpectedLength, 1);
              const elaboration = (density * 0.5) + (lengthScore * 0.5);

              return {
                fluency: Math.max(0, Math.min(1, fluency)),
                flexibility: Math.max(0, Math.min(1, flexibility)),
                originality: Math.max(0, Math.min(1, originality)),
                elaboration: Math.max(0, Math.min(1, elaboration))
              };
            };

            // Separate AI and Human nodes
            // AI nodes: generated by AI without any user interaction
            // Human nodes: any node that has been interacted with by the user:
            //   - Edited (text changed)
            //   - Manually created (Add button)
            //   - Manually positioned (dragged in exploration mode)
            //   - Adjusted in structure mode (impact/feasibility changed via drag)
            //   - Or if structureGridPositions exists (user dragged in structure mode)
            const aiNodes = nodes.filter(n => {
              const hasUserInteraction =
                n.manuallyCreated ||
                n.edited ||
                n.manuallyPositioned ||
                n.structureAdjusted ||
                structureGridPositions[n.id]; // Dragged in structure mode
              return !hasUserInteraction;
            });
            const humanNodes = nodes.filter(n => {
              return n.manuallyCreated ||
                n.edited ||
                n.manuallyPositioned ||
                n.structureAdjusted ||
                structureGridPositions[n.id]; // Dragged in structure mode
            });

            // If no human nodes, consider all nodes as AI
            const effectiveHumanNodes = humanNodes.length > 0 ? humanNodes : [];
            const effectiveAiNodes = aiNodes.length > 0 ? aiNodes : nodes;

            // Calculate scores
            const aiScores = calculateTTCTScores(effectiveAiNodes);
            const humanScores = calculateTTCTScores(effectiveHumanNodes);

            // Determine strengths
            const getStrengths = (scores) => {
              const strengths = [];
              if (scores.flexibility > 0.7) strengths.push('Flexibility');
              if (scores.originality > 0.7) strengths.push('Originality');
              if (scores.fluency > 0.7) strengths.push('Fluency');
              if (scores.elaboration > 0.7) strengths.push('Elaboration');
              return strengths.length > 0 ? strengths.join(' & ') : 'Balanced';
            };

            const aiStrengths = getStrengths(aiScores);
            const humanStrengths = getStrengths(humanScores);

            // Generate insight
            const generateInsight = () => {
              if (humanScores.originality > aiScores.originality && humanScores.flexibility > aiScores.flexibility) {
                return "Your originality and flexibility scores are higher than AI contributions, indicating strong creative independence.";
              } else if (humanScores.originality > aiScores.originality) {
                return "Your originality score is higher than AI contributions, showing unique creative thinking.";
              } else if (humanScores.flexibility > aiScores.flexibility) {
                return "Your flexibility score is higher than AI contributions, demonstrating diverse perspectives.";
              } else if (aiScores.fluency > humanScores.fluency && aiScores.elaboration > humanScores.elaboration) {
                return "AI contributions excel in fluency and elaboration, providing a strong foundation for your creative process.";
              } else {
                return "Your creative process shows a balanced collaboration between human insight and AI assistance.";
              }
            };

            return (
              <div className="space-y-8">
                {/* Two Column Layout */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Left: TTCT Creativity Dimensions - Radar Chart */}
                  <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">TTCT Creativity Dimensions</h3>
                    <div className="relative h-80 flex items-center justify-center">
                      <svg width="300" height="300" viewBox="0 0 300 300" className="absolute">
                        {/* Grid circles */}
                        {[25, 50, 75, 100].map((radius) => (
                          <circle
                            key={radius}
                            cx="150"
                            cy="150"
                            r={radius * 1.5}
                            fill="none"
                            stroke="#e5e7eb"
                            strokeWidth="1"
                            strokeDasharray="2,2"
                          />
                        ))}

                        {/* Axes - 4 axes evenly distributed */}
                        {[
                          { label: 'Fluency', angle: -90 },
                          { label: 'Flexibility', angle: 0 },
                          { label: 'Originality', angle: 90 },
                          { label: 'Elaboration', angle: 180 }
                        ].map((axis, idx) => {
                          const angle = (axis.angle * Math.PI) / 180;
                          const x = 150 + 150 * Math.cos(angle);
                          const y = 150 + 150 * Math.sin(angle);
                          return (
                            <g key={axis.label}>
                              <line
                                x1="150"
                                y1="150"
                                x2={x}
                                y2={y}
                                stroke="#d1d5db"
                                strokeWidth="1"
                              />
                              <text
                                x={x + (x > 150 ? 10 : x < 150 ? -10 : 0)}
                                y={y + (y > 150 ? 15 : y < 150 ? -5 : 0)}
                                fontSize="12"
                                fill="#6b7280"
                                textAnchor={x > 150 ? 'start' : x < 150 ? 'end' : 'middle'}
                                fontWeight="500"
                              >
                                {axis.label}
                              </text>
                            </g>
                          );
                        })}

                        {/* AI Polygon (pink) */}
                        <polygon
                          points={[
                            `${150 + aiScores.fluency * 150 * Math.cos(-90 * Math.PI / 180)},${150 + aiScores.fluency * 150 * Math.sin(-90 * Math.PI / 180)}`,
                            `${150 + aiScores.flexibility * 150 * Math.cos(0 * Math.PI / 180)},${150 + aiScores.flexibility * 150 * Math.sin(0 * Math.PI / 180)}`,
                            `${150 + aiScores.originality * 150 * Math.cos(90 * Math.PI / 180)},${150 + aiScores.originality * 150 * Math.sin(90 * Math.PI / 180)}`,
                            `${150 + aiScores.elaboration * 150 * Math.cos(180 * Math.PI / 180)},${150 + aiScores.elaboration * 150 * Math.sin(180 * Math.PI / 180)}`
                          ].join(' ')}
                          fill="#ec4899"
                          fillOpacity="0.3"
                          stroke="#ec4899"
                          strokeWidth="2"
                        />

                        {/* Human Polygon (purple) */}
                        {effectiveHumanNodes.length > 0 && (
                          <polygon
                            points={[
                              `${150 + humanScores.fluency * 150 * Math.cos(-90 * Math.PI / 180)},${150 + humanScores.fluency * 150 * Math.sin(-90 * Math.PI / 180)}`,
                              `${150 + humanScores.flexibility * 150 * Math.cos(0 * Math.PI / 180)},${150 + humanScores.flexibility * 150 * Math.sin(0 * Math.PI / 180)}`,
                              `${150 + humanScores.originality * 150 * Math.cos(90 * Math.PI / 180)},${150 + humanScores.originality * 150 * Math.sin(90 * Math.PI / 180)}`,
                              `${150 + humanScores.elaboration * 150 * Math.cos(180 * Math.PI / 180)},${150 + humanScores.elaboration * 150 * Math.sin(180 * Math.PI / 180)}`
                            ].join(' ')}
                            fill="#8b5cf6"
                            fillOpacity="0.3"
                            stroke="#8b5cf6"
                            strokeWidth="2"
                          />
                        )}
                      </svg>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-pink-500"></div>
                        <span className="text-sm text-gray-700">AI</span>
                      </div>
                      {effectiveHumanNodes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-500"></div>
                          <span className="text-sm text-gray-700">Human</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 bg-purple-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{generateInsight()}</p>
                    </div>
                  </div>

                  {/* Right: Side-by-Side Comparison - Bar Chart */}
                  <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Side-by-Side Comparison</h3>
                    <div className="h-80 flex flex-col justify-between">
                      {['fluency', 'flexibility', 'originality', 'elaboration'].map((dimension, idx) => {
                        const aiValue = aiScores[dimension] * 100;
                        const humanValue = effectiveHumanNodes.length > 0 ? humanScores[dimension] * 100 : 0;
                        const dimensionLabel = dimension.charAt(0).toUpperCase() + dimension.slice(1);
                        return (
                          <div key={dimension} className="flex items-center gap-4">
                            <div className="w-24 text-sm text-gray-600 font-medium">{dimensionLabel}</div>
                            <div className="flex-1 flex items-center gap-3">
                              {/* AI Bar */}
                              <div className="flex-1 h-10 bg-gray-100 rounded relative overflow-hidden">
                                <div
                                  className="h-full bg-pink-500 rounded flex items-center justify-end pr-2"
                                  style={{ width: `${aiValue}%` }}
                                >
                                  <span className="text-xs font-semibold text-white">{Math.round(aiValue)}%</span>
                                </div>
                                {aiValue < 10 && (
                                  <div className="absolute inset-0 flex items-center justify-start pl-2">
                                    <span className="text-xs font-semibold text-gray-700">{Math.round(aiValue)}%</span>
                                  </div>
                                )}
                              </div>
                              {/* Human Bar */}
                              {effectiveHumanNodes.length > 0 ? (
                                <div className="flex-1 h-10 bg-gray-100 rounded relative overflow-hidden">
                                  <div
                                    className="h-full bg-purple-500 rounded flex items-center justify-end pr-2"
                                    style={{ width: `${humanValue}%` }}
                                  >
                                    <span className="text-xs font-semibold text-white">{Math.round(humanValue)}%</span>
                                  </div>
                                  {humanValue < 10 && (
                                    <div className="absolute inset-0 flex items-center justify-start pl-2">
                                      <span className="text-xs font-semibold text-gray-700">{Math.round(humanValue)}%</span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex-1 h-10 bg-gray-100 rounded flex items-center justify-center">
                                  <span className="text-xs text-gray-400">No human data</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-pink-500"></div>
                        <span className="text-sm text-gray-700">AI</span>
                      </div>
                      {effectiveHumanNodes.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded bg-purple-500"></div>
                          <span className="text-sm text-gray-700">Human</span>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs">👤</div>
                          <span className="text-sm font-semibold text-gray-800">Your Strength</span>
                        </div>
                        <p className="text-xs text-gray-600">{humanStrengths}</p>
                      </div>
                      <div className="bg-pink-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center text-white text-xs">✨</div>
                          <span className="text-sm font-semibold text-gray-800">AI Strength</span>
                        </div>
                        <p className="text-xs text-gray-600">{aiStrengths}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Understanding TTCT Dimensions */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">Understanding TTCT Dimensions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Fluency</h4>
                      <p className="text-sm text-gray-600">The ability to generate a large number of ideas quickly. Measures idea quantity and brainstorming productivity.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Flexibility</h4>
                      <p className="text-sm text-gray-600">The ability to approach problems from different perspectives and switch between categories of thinking.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Originality</h4>
                      <p className="text-sm text-gray-600">The uniqueness and novelty of ideas. Measures how different your concepts are from common responses.</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-800 mb-2">Elaboration</h4>
                      <p className="text-sm text-gray-600">The ability to develop and add detail to ideas. Measures depth and completeness of concepts.</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <>
              {/* Large Graph */}
              <div className="bg-gray-50 rounded-lg p-8 mb-6">
                <div className="relative h-[500px]">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {/* Background grid pattern (same as Creative Flow Timeline) */}
                    <defs>
                      <pattern id="timeline-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#timeline-grid)" />

                    {/* Creativity line (green) - same calculation as Creative Flow Timeline */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                        const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                        const y = 90 - (creativity * 80);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                      const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                      const y = 90 - (creativity * 80);
                      return (
                        <g key={`creativity-detail-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#10b981"
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.9"
                          />
                          <text
                            x={x}
                            y={y - 6}
                            fontSize="4.5"
                            fill="#10b981"
                            textAnchor="middle"
                            fontWeight="bold"
                          >
                            {Math.round(creativity * 100)}%
                          </text>
                        </g>
                      );
                    })}

                    {/* Dependency line (orange) - same calculation as Creative Flow Timeline */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                        const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                        const y = 90 - (dependency * 80);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                      const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                      const y = 90 - (dependency * 80);
                      return (
                        <g key={`dependency-detail-${index}`}>
                          <circle
                            cx={x}
                            cy={y}
                            r="4"
                            fill="#f97316"
                            stroke="white"
                            strokeWidth="2"
                            opacity="0.9"
                          />
                          <text
                            x={x}
                            y={y + 8}
                            fontSize="4.5"
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
      <div className="flex-1 flex overflow-hidden relative">
        {/* Top Menu Bar - Only in Exploration Mode, Canvas Centered */}
        {mode === 'exploration' && nodes.length > 0 && (
          <div className={`absolute top-6 z-50 ${isReflectionSidebarOpen ? 'left-[calc(50%-200px)]' : 'left-1/2'} transform -translate-x-1/2`}>
            <div className="bg-white rounded-lg shadow-lg border border-purple-200 px-2 py-2 flex items-center gap-1">
              {/* Home Button */}
              <button
                onClick={handleHome}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-purple-50 transition-colors text-gray-700 font-medium"
                title="Return to home"
              >
                <Home size={18} />
                <span>Home</span>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-300"></div>

              {/* Structure Mode Button - Go to existing structure if available */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Only allow navigation if hierarchyAnalysis exists
                  if (!hierarchyAnalysis) {
                    return; // Do nothing if no structure exists
                  }
                  // If hierarchyAnalysis exists, just switch to structure mode
                  // Position recalculation will be handled by useEffect
                  setMode('structure');
                }}
                disabled={!hierarchyAnalysis}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-gray-700 font-medium ${hierarchyAnalysis
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                title={hierarchyAnalysis ? 'Go to Structure Mode' : 'No structure available. Generate structure first using "Generate Structure" button.'}
              >
                <LayoutGrid size={18} />
                <span>Structure Mode</span>
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-300"></div>

              {/* Generate Structure Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Add click animation
                  e.currentTarget.style.transform = 'scale(0.95)';
                  setTimeout(() => {
                    e.currentTarget.style.transform = '';
                  }, 150);
                  analyzeHierarchy();
                }}
                disabled={analyzingStructure || selectedForStructure.size < 2}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-gray-700 font-medium ${selectedForStructure.size >= 2 && !analyzingStructure
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-700 shadow-md animate-pulse hover:scale-105 active:scale-95'
                  : analyzingStructure
                    ? 'bg-purple-200 text-purple-800 shadow-lg cursor-wait'
                    : 'hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                title={analyzingStructure ? 'Analyzing structure...' : selectedForStructure.size >= 2 ? `Generate Structure (${selectedForStructure.size} selected)` : 'Select at least 2 nodes to generate structure'}
              >
                {analyzingStructure ? (
                  <>
                    <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <LayoutGrid size={18} />
                    <span>Generate Structure</span>
                    {selectedForStructure.size >= 2 && (
                      <span className="ml-1 px-2 py-0.5 bg-purple-600 text-white text-xs rounded-full">
                        {selectedForStructure.size}
                      </span>
                    )}
                  </>
                )}
              </button>

              {/* Divider */}
              <div className="w-px h-8 bg-gray-300"></div>

              {/* Expand with AI Button */}
              <button
                onClick={handleExpandAll}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-orange-50 transition-colors text-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                title="Expand all leaf nodes with AI"
              >
                <Sparkles size={18} className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-orange-500" />
                <span>Expand with AI</span>
              </button>
            </div>
          </div>
        )}
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
            <defs>
              <linearGradient id="multiSelectGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.8" />
              </linearGradient>
            </defs>
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
            const buttonRadius = (nodeSize / 2) + 10; // 버튼들이 노드 주변에 배치될 반경 (더 가깝게)
            const hoverAreaSize = nodeSize + (buttonRadius * 2) + 20; // Hover 영역 확장
            const clickAreaSize = nodeSize + 10; // 클릭 영역을 노드 크기보다 약간 크게 (겹치는 노드 구분)

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
                  onClick={(e) => {
                    // 노드 전체 영역 클릭 처리 (버튼 제외, 드래그가 아닌 경우만)
                    const target = e.target as HTMLElement;
                    const isDrag = draggingNode === node.id && (
                      Math.abs(e.clientX - mouseDownPos.x) > 5 ||
                      Math.abs(e.clientY - mouseDownPos.y) > 5
                    );

                    if (!target.closest('button') && target.tagName !== 'BUTTON' && !isSpacePressed && !isDrag) {
                      handleNodeClick(node, e);
                    }
                  }}
                  className="absolute"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: `${clickAreaSize}px`,
                    height: `${clickAreaSize}px`,
                    cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (isDragging ? 'grabbing' : 'grab'),
                    pointerEvents: 'auto',
                    zIndex: isSelected || hoveredNodeId === node.id ? 20 : 1
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
                        className={`rounded-full shadow-md cursor-pointer hover:shadow-xl transition-all relative flex flex-col items-center justify-center ${isSelected ? 'scale-105 ring-2 ring-blue-400' : isFocused ? 'scale-110 shadow-2xl' : ''} ${node.isAnimating ? 'node-appear' : ''}`}
                        style={{
                          transition: node.isAnimating ? 'none' : 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          width: '100%',
                          height: '100%',
                          padding: isSelectedForStructure && selectedForStructure.size > 1 ? '3px' : '0px',
                          background: isSelectedForStructure && selectedForStructure.size > 1
                            ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #f59e0b 100%)'
                            : 'transparent',
                          animation: isSelectedForStructure && selectedForStructure.size > 1 ? 'gradientSpread 0.6s ease-out' : undefined
                        }}
                      >
                        <div
                          className={`rounded-full w-full h-full flex flex-col items-center justify-center relative transition-all ${isSelectedForStructure && selectedForStructure.size > 1 ? '' : 'border-2'}`}
                          style={{
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            background: node.type === 'topic' ? '#f3e8ff' : node.type === 'main' ? '#eff6ff' :
                              node.type === 'sub' ? '#f0fdf4' :
                                node.type === 'insight' ? '#fefce8' :
                                  node.type === 'opportunity' ? '#faf5ff' : '#ffffff',
                            borderColor: !isSelectedForStructure || selectedForStructure.size === 1
                              ? (isSelectedForStructure
                                ? '#9333ea'
                                : node.type === 'topic' ? '#a855f7' : node.type === 'main' ? '#3b82f6' :
                                  node.type === 'sub' ? '#10b981' :
                                    node.type === 'insight' ? '#eab308' :
                                      node.type === 'opportunity' ? '#a855f7' : 'transparent')
                              : undefined,
                            padding: node.type === 'topic' ? '14px' : node.type === 'main' ? '12px' : node.type === 'sub' ? '10px' : '8px',
                            boxShadow: isSelectedForStructure && selectedForStructure.size > 1
                              ? '0 0 15px rgba(236, 72, 153, 0.4), 0 0 25px rgba(245, 158, 11, 0.3)'
                              : undefined
                          }}
                        >
                          {node.category && (
                            <span className="absolute -top-2 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-semibold text-gray-600 bg-white shadow-sm border border-gray-200 whitespace-nowrap">
                              {node.category}
                            </span>
                          )}
                          <div
                            className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center px-2 py-1"
                            style={{
                              maxWidth: '100%',
                              overflow: isSelected ? 'auto' : 'hidden',
                              wordBreak: 'break-word'
                            }}
                          >
                            {/* 키워드 - 선택되지 않은 노드에서는 말줄임표, 선택된 노드에서는 전체 */}
                            <p
                              className={`break-words text-gray-700 leading-tight font-semibold ${node.type === 'topic' ? 'text-sm' : node.type === 'main' ? 'text-xs' : 'text-xs'}`}
                              style={{
                                maxWidth: '100%',
                                overflow: isSelected ? 'visible' : 'hidden',
                                lineHeight: '1.3',
                                display: isSelected ? 'block' : '-webkit-box',
                                WebkitLineClamp: isSelected ? undefined : 1,
                                WebkitBoxOrient: isSelected ? 'initial' : 'vertical',
                                wordBreak: 'break-word'
                              }}
                              title={!isSelected ? (node.keyword || extractKeyword(node.text)) : undefined}
                            >
                              {isSelected
                                ? (node.keyword || extractKeyword(node.text))
                                : getDisplayText(node.keyword || extractKeyword(node.text), nodeSize, false)
                              }
                            </p>
                            {/* 상세 텍스트 - 선택된 노드에서만 표시, 전체 내용을 여러 줄로 표시 */}
                            {isSelected && (
                              <div
                                className="break-words text-gray-600 leading-tight mt-1 text-[10px] w-full"
                                style={{
                                  maxWidth: '100%',
                                  lineHeight: '1.4',
                                  wordBreak: 'break-word',
                                  maxHeight: `${Math.max(40, nodeSize * 0.5)}px`,
                                  overflowY: 'auto',
                                  overflowX: 'hidden',
                                  paddingRight: '2px'
                                }}
                              >
                                {node.text}
                              </div>
                            )}
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
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-2xl px-8 py-6 flex flex-col items-center gap-4 min-w-[200px]">
                <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full loading-spinner"></div>
                <p className="text-gray-700 font-semibold text-lg">Generating ideas...</p>
                <p className="text-gray-500 text-sm">Please wait</p>
              </div>
            </div>
          )}


          {mode === 'exploration' && nodes.length > 0 && (
            <div className={`fixed bottom-6 w-[480px] z-[100] shadow-2xl bg-white rounded-lg ${isReflectionSidebarOpen ? 'right-[400px]' : 'right-6'}`} style={{ pointerEvents: 'auto' }}>
              <div className="bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-gray-800">Creative Flow Timeline</h3>
                  <p className="text-xs text-gray-600 mt-1">Watch your creativity journey unfold! 🎨</p>
                </div>
                <div className="border-t border-dotted border-blue-300 mb-3"></div>

                <div className="relative h-32 bg-gray-50 rounded-lg p-4 mb-3">
                  <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                    {/* Background grid lines for better visualization */}
                    <defs>
                      <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e5e7eb" strokeWidth="0.5" opacity="0.5" />
                      </pattern>
                    </defs>
                    <rect width="100" height="100" fill="url(#grid)" />

                    {/* Creativity line (green) */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                        const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                        const y = 90 - (creativity * 80);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                      const creativity = typeof metrics === 'object' ? metrics.creativity : (typeof metrics === 'number' ? metrics : 0);
                      const y = 90 - (creativity * 80);
                      return (
                        <circle
                          key={`creativity-${index}`}
                          cx={x}
                          cy={y}
                          r="3.5"
                          fill="#10b981"
                          stroke="white"
                          strokeWidth="2"
                          opacity="0.9"
                        />
                      );
                    })}

                    {/* Dependency line (orange) */}
                    <polyline
                      points={creativityHistory.map((metrics, index) => {
                        const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                        const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                        const y = 90 - (dependency * 80);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#f97316"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {creativityHistory.map((metrics, index) => {
                      const x = (index / Math.max(creativityHistory.length - 1, 1)) * 92 + 4;
                      const dependency = typeof metrics === 'object' ? metrics.dependency : 0;
                      const y = 90 - (dependency * 80);
                      return (
                        <circle
                          key={`dependency-${index}`}
                          cx={x}
                          cy={y}
                          r="3.5"
                          fill="#f97316"
                          stroke="white"
                          strokeWidth="2"
                          opacity="0.9"
                        />
                      );
                    })}
                  </svg>
                </div>

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

        {/* Reflection Sidebar Toggle Button (when closed) */}
        {!isReflectionSidebarOpen && reflections.length > 0 && (
          <button
            onClick={() => setIsReflectionSidebarOpen(true)}
            className="fixed top-4 right-4 z-50 w-12 h-12 bg-white rounded-lg shadow-lg border-2 border-yellow-300 flex items-center justify-center hover:bg-yellow-50 transition-all hover:scale-105 relative"
            title="Open Reflections"
          >
            <Lightbulb className="text-yellow-600" size={24} />
            {/* Alert badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center border-2 border-white">
              <AlertCircle size={12} className="text-white" />
            </div>
          </button>
        )}

        {/* Reflection Sidebar */}
        {isReflectionSidebarOpen && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-4 relative flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="text-yellow-500" size={24} />
                <h2 className="text-xl font-bold text-gray-800">Reflections</h2>
              </div>
              <button
                onClick={() => setIsReflectionSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                title="Close Reflections"
              >
                <ChevronRight size={20} className="text-gray-500" />
              </button>
            </div>

            {reflections.length === 0 ? (
              <div className="text-center text-gray-400 mt-8">
                <Lightbulb size={48} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">Generate ideas to see reflections here</p>
              </div>
            ) : (
              <div className="space-y-3 pb-96">
                {reflections.map(reflection => {
                  const isExpanded = expandedReflectionId === reflection.id;

                  // Get color scheme based on type
                  const getTypeStyle = (type) => {
                    switch (type) {
                      case 'critic':
                        return {
                          bg: 'bg-gradient-to-br from-red-50 to-orange-50',
                          border: 'border-red-200',
                          title: 'Critical Question',
                          titleColor: 'text-red-700'
                        };
                      case 'advice':
                        return {
                          bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
                          border: 'border-blue-200',
                          title: 'Strategic Advice',
                          titleColor: 'text-blue-700'
                        };
                      default:
                        return {
                          bg: 'bg-gradient-to-br from-yellow-50 to-orange-50',
                          border: 'border-yellow-200',
                          title: 'Reflection',
                          titleColor: 'text-gray-700'
                        };
                    }
                  };

                  const typeStyle = getTypeStyle(reflection.type);

                  return (
                    <div
                      key={reflection.id}
                      onClick={() => handleReflectionClick(reflection.id, reflection.nodeId)}
                      className={`${typeStyle.bg} rounded-lg p-4 shadow-sm border ${typeStyle.border} relative cursor-pointer hover:shadow-md transition-all`}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReflection(reflection.id);
                        }}
                        className="absolute top-2 right-2 p-1 hover:bg-white rounded transition-colors z-10"
                        title="Delete"
                      >
                        <X size={16} className="text-gray-500" />
                      </button>
                      <div className="pr-6">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold ${typeStyle.titleColor} uppercase tracking-wide`}>
                            {typeStyle.title}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-800 text-sm mb-1">
                          {reflection.title || reflection.topic}
                        </h3>
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {reflection.content}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}