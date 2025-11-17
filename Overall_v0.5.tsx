import React, { useState, useRef, useEffect } from 'react';
import { Edit2, Trash2, Zap, X, Lightbulb, ChevronUp, ChevronDown, ArrowRight, ArrowLeft, Check } from 'lucide-react';

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
  const [nodes, setNodes] = useState([]);
  const [reflections, setReflections] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedNode, setFocusedNode] = useState(null);
  const [creativityHistory, setCreativityHistory] = useState([]);
  const [showFullGraph, setShowFullGraph] = useState(false);
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
  const nodeRefs = useRef({});
  const reflectionRefs = useRef({});

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
      structureReflections
    };
    localStorage.setItem('ideaTreeData', JSON.stringify(dataToSave));
  }, [nodes, reflections, creativityHistory, editCount, aiGenerationCount, hierarchyAnalysis, structureReflections]);

  const calculateCreativityGravity = () => {
    const weights = {
      aiGeneration: 0.4,
      userEdit: 0.3,
      treeStructure: 0.3
    };

    const totalActions = aiGenerationCount + editCount;
    if (totalActions === 0) return 0.5;

    const aiScore = aiGenerationCount / totalActions;
    const humanScore = editCount / totalActions;
    const maxDepth = Math.max(...nodes.map(n => n.level), 0);
    const structureScore = Math.min(maxDepth / 5, 1);

    const gravity =
      (humanScore * weights.userEdit) +
      (structureScore * weights.treeStructure) +
      ((1 - aiScore) * weights.aiGeneration);

    return Math.max(0, Math.min(1, gravity));
  };

  const generateIdeas = async (prompt, parentId = null) => {
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
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
              content: `Generate 3 related ideas or subtopics for "${prompt}". 

For each idea, optionally provide a brief reflection (5-7 sentences) ONLY if you have meaningful advice, a better perspective, or valuable insights. If there's nothing particularly insightful to add, set reflection to null.

Respond ONLY in JSON format with no other explanation.

Format: 
{
  "ideas": [
    {
      "text": "idea 1",
      "reflection": "Brief insight in 5-7 sentences..." or null
    },
    {
      "text": "idea 2",
      "reflection": null
    },
    {
      "text": "idea 3",
      "reflection": "Another brief insight..." or null
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

      const newAiCount = aiGenerationCount + 1;
      setAiGenerationCount(newAiCount);

      const newNodes = parsed.ideas.map((ideaObj, index) => {
        const nodeId = Date.now() + index;

        if (ideaObj.reflection) {
          setReflections(prev => [{
            id: Date.now() + index + 1000,
            nodeId: nodeId,
            topic: ideaObj.text,
            content: ideaObj.reflection,
            timestamp: new Date().toLocaleTimeString()
          }, ...prev]);
        }

        return {
          id: nodeId,
          text: ideaObj.text,
          parentId: parentId,
          x: parentId ? 0 : 200 + (index * 250),
          y: parentId ? 0 : 200,
          level: parentId ? (nodes.find(n => n.id === parentId)?.level || 0) + 1 : 0
        };
      });

      setNodes(prev => [...prev, ...newNodes]);

      const newGravity = calculateCreativityGravity();
      setCreativityHistory(prev => [...prev, newGravity]);
    } catch (err) {
      console.error('Generation error:', err);
      alert('An error occurred while generating ideas.');
    }
    setLoading(false);
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

      const response = await fetch("https://api.anthropic.com/v1/messages", {
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

    const newGravity = calculateCreativityGravity();
    setCreativityHistory(prev => {
      const updated = [...prev];
      if (updated.length > 0) {
        updated[updated.length - 1] = newGravity;
      }
      return updated;
    });

    setEditingNode(null);
    setEditValue('');
  };

  const handleGenerate = (node) => {
    generateIdeas(node.text, node.id);
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

    setFocusedNode(nodeId);

    const nodeElement = nodeRefs.current[nodeId];
    if (nodeElement) {
      nodeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

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
    if (editingNode === node.id || e.target.closest('.node-controls')) return;

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

    if (!node.parentId) return { x: node.x, y: node.y };

    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return { x: node.x, y: node.y };

    const siblings = nodes.filter(n => n.parentId === node.parentId);
    const index = siblings.findIndex(n => n.id === node.id);
    const parentPos = getNodePosition(parent);

    return {
      x: parentPos.x + (index - 1) * 200,
      y: parentPos.y + 150
    };
  };

  const renderConnections = () => {
    return nodes
      .filter(node => node.parentId)
      .map(node => {
        const parent = nodes.find(n => n.id === node.parentId);
        if (!parent) return null;

        const parentPos = getNodePosition(parent);
        const nodePos = getNodePosition(node);

        return (
          <line
            key={`line-${node.id}`}
            x1={parentPos.x + 75}
            y1={parentPos.y + 40}
            x2={nodePos.x + 75}
            y2={nodePos.y}
            stroke="#cbd5e1"
            strokeWidth="2"
          />
        );
      });
  };

  const currentGravity = creativityHistory.length > 0
    ? creativityHistory[creativityHistory.length - 1]
    : 0.5;

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

            {creativityHistory.length > 0 && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-96 z-20">
                <div
                  onClick={() => setShowFullGraph(!showFullGraph)}
                  className="bg-white rounded-full shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-between mb-2 text-xs font-semibold">
                    <span className="text-purple-600">AI</span>
                    <span className="text-gray-600">Creativity Gravity</span>
                    <span className="text-blue-600">Human</span>
                  </div>
                  <div className="relative h-3 bg-gradient-to-r from-purple-200 via-gray-200 to-blue-200 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 h-full w-1 bg-gray-800 transition-all duration-500"
                      style={{ left: `${currentGravity * 100}%` }}
                    />
                  </div>
                  <div className="text-center mt-2">
                    <button className="text-xs text-gray-500 hover:text-gray-700">
                      {showFullGraph ? <ChevronDown size={16} className="inline" /> : <ChevronUp size={16} className="inline" />}
                      {showFullGraph ? ' Hide' : ' Show'} Details
                    </button>
                  </div>
                </div>

                {showFullGraph && (
                  <div className="mt-4 bg-white rounded-lg shadow-xl p-6 h-64">
                    <h3 className="text-sm font-bold text-gray-800 mb-4">Creativity Flow Over Time</h3>
                    <div className="relative h-48 border-l-2 border-b-2 border-gray-300">
                      <div className="absolute top-0 left-0 text-xs text-gray-500">Human</div>
                      <div className="absolute bottom-0 left-0 text-xs text-gray-500">AI</div>
                      <div className="absolute bottom-0 right-0 text-xs text-gray-500">API Calls →</div>

                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <polyline
                          points={creativityHistory.map((gravity, index) => {
                            const x = (index / (creativityHistory.length - 1 || 1)) * 100;
                            const y = (1 - gravity) * 100;
                            return `${x},${y}`;
                          }).join(' ')}
                          fill="none"
                          stroke="#3b82f6"
                          strokeWidth="2"
                          vectorEffect="non-scaling-stroke"
                        />
                        {creativityHistory.map((gravity, index) => {
                          const x = (index / (creativityHistory.length - 1 || 1)) * 100;
                          const y = (1 - gravity) * 100;
                          return (
                            <circle
                              key={index}
                              cx={x}
                              cy={y}
                              r="2"
                              fill="#3b82f6"
                              vectorEffect="non-scaling-stroke"
                            />
                          );
                        })}
                      </svg>
                    </div>
                    <div className="mt-4 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>AI Generations: {aiGenerationCount}</span>
                        <span>User Edits: {editCount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

  return (
    <div className="w-full h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      <div className="bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-800">💡 Exploration Mode</h1>
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
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading && nodes.length === 0 && inputValue.trim()) {
                generateIdeas(inputValue.trim());
                setInputValue('');
              }
            }}
            placeholder="Enter an idea or question..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            disabled={loading || nodes.length > 0}
          />
          <button
            onClick={() => {
              if (inputValue.trim() && !loading && nodes.length === 0) {
                generateIdeas(inputValue.trim());
                setInputValue('');
              }
            }}
            disabled={loading || nodes.length > 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
          >
            {loading ? 'Generating...' : 'Generate'}
          </button>
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
                localStorage.removeItem('ideaTreeData');
              }}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
            >
              Reset
            </button>
          )}
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

            return (
              <div
                key={node.id}
                ref={el => nodeRefs.current[node.id] = el}
                onMouseDown={(e) => handleMouseDown(e, node)}
                className="absolute"
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: '150px',
                  cursor: isSpacePressed ? (isPanning ? 'grabbing' : 'grab') : (isDragging ? 'grabbing' : 'grab'),
                  pointerEvents: isSpacePressed ? 'none' : 'auto'
                }}
              >
                {isEditing ? (
                  <div className="bg-white p-3 rounded-lg shadow-lg border-2 border-blue-500">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full p-2 border rounded text-sm resize-none"
                      rows="3"
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
                      className={`bg-white p-4 rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all border-2 relative ${isSelected ? 'border-blue-500 scale-105' :
                          isFocused ? 'border-yellow-400 scale-110 shadow-2xl' :
                            isSelectedForStructure ? 'border-purple-500' :
                              'border-transparent'
                        }`}
                      style={{
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div
                        className="absolute top-1 right-1 z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleNodeSelection(node.id);
                        }}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${isSelectedForStructure ? 'bg-purple-600 border-purple-600' : 'bg-white border-gray-300'
                          }`}>
                          {isSelectedForStructure && <Check size={14} className="text-white" />}
                        </div>
                      </div>
                      <div onClick={() => handleNodeClick(node)}>
                        <p className="text-sm text-gray-700 break-words pr-6">{node.text}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-10 flex gap-2 node-controls">
                        <button
                          onClick={() => handleEdit(node)}
                          className="p-2 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleGenerate(node)}
                          className="p-2 hover:bg-green-50 rounded transition-colors"
                          title="Generate"
                          disabled={loading}
                        >
                          <Zap size={18} className="text-green-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(node.id)}
                          className="p-2 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    )}
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

          {creativityHistory.length > 0 && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-96 z-20">
              <div
                onClick={() => setShowFullGraph(!showFullGraph)}
                className="bg-white rounded-full shadow-lg p-4 cursor-pointer hover:shadow-xl transition-shadow"
              >
                <div className="flex items-center justify-between mb-2 text-xs font-semibold">
                  <span className="text-purple-600">AI</span>
                  <span className="text-gray-600">Creativity Gravity</span>
                  <span className="text-blue-600">Human</span>
                </div>
                <div className="relative h-3 bg-gradient-to-r from-purple-200 via-gray-200 to-blue-200 rounded-full overflow-hidden">
                  <div
                    className="absolute top-0 h-full w-1 bg-gray-800 transition-all duration-500"
                    style={{ left: `${currentGravity * 100}%` }}
                  />
                </div>
                <div className="text-center mt-2">
                  <button className="text-xs text-gray-500 hover:text-gray-700">
                    {showFullGraph ? <ChevronDown size={16} className="inline" /> : <ChevronUp size={16} className="inline" />}
                    {showFullGraph ? ' Hide' : ' Show'} Details
                  </button>
                </div>
              </div>

              {showFullGraph && (
                <div className="mt-4 bg-white rounded-lg shadow-xl p-6 h-64">
                  <h3 className="text-sm font-bold text-gray-800 mb-4">Creativity Flow Over Time</h3>
                  <div className="relative h-48 border-l-2 border-b-2 border-gray-300">
                    <div className="absolute top-0 left-0 text-xs text-gray-500">Human</div>
                    <div className="absolute bottom-0 left-0 text-xs text-gray-500">AI</div>
                    <div className="absolute bottom-0 right-0 text-xs text-gray-500">API Calls →</div>

                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <polyline
                        points={creativityHistory.map((gravity, index) => {
                          const x = (index / (creativityHistory.length - 1 || 1)) * 100;
                          const y = (1 - gravity) * 100;
                          return `${x},${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      {creativityHistory.map((gravity, index) => {
                        const x = (index / (creativityHistory.length - 1 || 1)) * 100;
                        const y = (1 - gravity) * 100;
                        return (
                          <circle
                            key={index}
                            cx={x}
                            cy={y}
                            r="2"
                            fill="#3b82f6"
                            vectorEffect="non-scaling-stroke"
                          />
                        );
                      })}
                    </svg>
                  </div>
                  <div className="mt-4 text-xs text-gray-600">
                    <div className="flex justify-between">
                      <span>AI Generations: {aiGenerationCount}</span>
                      <span>User Edits: {editCount}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-4">
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
            <div className="space-y-3">
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