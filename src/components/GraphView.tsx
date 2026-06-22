import React, { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide } from 'd3-force';
import type { Simulation, SimulationLinkDatum } from 'd3-force';
import type { GraphData, GraphNode, GraphLink } from '../utils/graphData';
import { getNodeColor, getLinkColor } from '../utils/graphData';

export interface GraphViewProps {
  graphData: GraphData;
  mode: 'global' | 'local';
  centerNodeId?: string;
  onNodeClick: (nodePath: string) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  highlightedNodes?: Set<string>;
  width?: number;
  height?: number;
}

interface D3Node extends GraphNode {
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface D3Link extends SimulationLinkDatum<D3Node> {
  source: string | D3Node;
  target: string | D3Node;
}

/**
 * Graph visualization component using Canvas 2D + d3-force
 * No THREE.js, no conflicting dependencies - clean and performant
 */
export function GraphView({
  graphData,
  mode,
  centerNodeId,
  onNodeClick,
  onNodeHover,
  highlightedNodes,
  width,
  height,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simulationRef = useRef<Simulation<D3Node, D3Link> | null>(null);
  const nodesRef = useRef<D3Node[]>([]);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragNode, setDragNode] = useState<D3Node | null>(null);
  const [measuredSize, setMeasuredSize] = useState({ width: width ?? 800, height: height ?? 600 });
  const animationFrameRef = useRef<number | null>(null);
  const canvasWidth = width ?? measuredSize.width;
  const canvasHeight = height ?? measuredSize.height;

  useEffect(() => {
    if (width && height) return;
    const container = containerRef.current;
    if (!container) return;
    const observedContainer = container;

    function updateSize() {
      setMeasuredSize({
        width: Math.max(320, Math.floor(observedContainer.clientWidth || 800)),
        height: Math.max(260, Math.floor(observedContainer.clientHeight || 600)),
      });
    }

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(observedContainer);
    return () => observer.disconnect();
  }, [width, height]);

  // Calculate highlighted links
  const highlightedLinks = useMemo(() => {
    const links = new Set<GraphLink>();

    if (hoveredNode) {
      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
        
        if (sourceId === hoveredNode.id || targetId === hoveredNode.id) {
          links.add(link);
        }
      });
    }

    if (highlightedNodes && highlightedNodes.size > 0) {
      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;

        if (highlightedNodes.has(sourceId) || highlightedNodes.has(targetId)) {
          links.add(link);
        }
      });
    }

    return links;
  }, [hoveredNode, highlightedNodes, graphData.links]);

  // Initialize simulation
  useEffect(() => {
    if (!graphData.nodes.length) return;

    const d3Nodes: D3Node[] = graphData.nodes.map((n) => ({
      ...n,
      x: Math.random() * canvasWidth - canvasWidth / 2,
      y: Math.random() * canvasHeight - canvasHeight / 2,
      vx: 0,
      vy: 0,
    }));

    nodesRef.current = d3Nodes;

    const d3Links: D3Link[] = graphData.links.map((l) => ({
      source: typeof l.source === 'string' ? l.source : (l.source as GraphNode).id,
      target: typeof l.target === 'string' ? l.target : (l.target as GraphNode).id,
    }));

    // Create force simulation
    const simulation = forceSimulation(d3Nodes)
      .force(
        'link',
        forceLink<D3Node, D3Link>(d3Links)
          .id((d: D3Node) => d.id)
          .distance(100)
          .strength(0.5)
      )
      .force('charge', forceManyBody<D3Node>().strength(-300).distanceMax(500))
      .force('center', forceCenter(0, 0))
      .force('collide', forceCollide<D3Node>().radius(25).iterations(2));

    simulationRef.current = simulation;

    // Animation loop
    const animate = () => {
      // Timestamp available for frame rate calculations in future
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      const offsetX = canvasWidth / 2;
      const offsetY = canvasHeight / 2;

      // Draw links
      graphData.links.forEach((link) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as GraphNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as GraphNode).id;
        
        const sourceNode = nodesRef.current.find((n) => n.id === sourceId);
        const targetNode = nodesRef.current.find((n) => n.id === targetId);

        if (
          sourceNode?.x === undefined ||
          sourceNode.y === undefined ||
          targetNode?.x === undefined ||
          targetNode.y === undefined
        ) {
          return;
        }

        const isHighlighted = highlightedLinks.has(link);
        const linkColor = getLinkColor(link.type);

        ctx.strokeStyle = isHighlighted ? linkColor : `${linkColor}40`;
        ctx.lineWidth = isHighlighted ? 2 : 1;

        if (link.type === 'hierarchy') {
          ctx.setLineDash([5, 5]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(sourceNode.x + offsetX, sourceNode.y + offsetY);
        ctx.lineTo(targetNode.x + offsetX, targetNode.y + offsetY);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Draw nodes
      nodesRef.current.forEach((node) => {
        if (node.x === undefined || node.y === undefined) return;

        const isCenterNode = mode === 'local' && node.id === centerNodeId;
        const isHighlighted = highlightedNodes?.has(node.id);
        const isHovered = hoveredNode?.id === node.id;

        let nodeSize = 6 + (node.degree || 0) * 0.8;
        if (isCenterNode) nodeSize *= 1.8;
        if (isHighlighted || isHovered) nodeSize *= 1.3;

        // Draw node circle
        const nodeColor = getNodeColor(node.type);
        ctx.fillStyle = isCenterNode ? '#3f7f64' : nodeColor;
        ctx.beginPath();
        ctx.arc(node.x + offsetX, node.y + offsetY, nodeSize, 0, Math.PI * 2);
        ctx.fill();

        // Draw border
        if (isCenterNode || isHighlighted || isHovered) {
          ctx.strokeStyle = isCenterNode ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = isCenterNode ? 3 : 2;
          ctx.stroke();
        }

        // Draw label
        if (isHovered || isHighlighted || isCenterNode) {
          const fontSize = isCenterNode ? 13 : isHovered ? 11 : 10;
          ctx.font = `${fontSize}px Inter, sans-serif`;
          ctx.fillStyle = '#000000';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          const label = node.label.substring(0, 20);
          ctx.fillText(label, node.x + offsetX, node.y + offsetY + nodeSize + 4);
        }
      });
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      simulation.stop();
    };
  }, [graphData.nodes, graphData.links, canvasWidth, canvasHeight, mode, centerNodeId, highlightedNodes, hoveredNode]);

  // Handle mouse move for hover and dragging
  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - canvasWidth / 2;
      const y = event.clientY - rect.top - canvasHeight / 2;

      // Find hovered node
      let found: D3Node | null = null;
      for (const node of nodesRef.current) {
        if (node.x !== undefined && node.y !== undefined) {
          const dx = node.x - x;
          const dy = node.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 20) {
            found = node;
            break;
          }
        }
      }

      setHoveredNode(found || null);
      onNodeHover?.(found || null);
      canvas.style.cursor = found ? 'pointer' : 'default';

      // Handle dragging
      if (isDragging && dragNode) {
        dragNode.fx = x;
        dragNode.fy = y;
      }
    },
    [canvasWidth, canvasHeight, isDragging, dragNode, onNodeHover]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left - canvasWidth / 2;
      const y = event.clientY - rect.top - canvasHeight / 2;

      for (const node of nodesRef.current) {
        if (node.x !== undefined && node.y !== undefined) {
          const dx = node.x - x;
          const dy = node.y - y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 20) {
            setIsDragging(true);
            setDragNode(node);
            node.fx = x;
            node.fy = y;
            if (simulationRef.current) {
              simulationRef.current.alpha(0.5).restart();
            }
            onNodeClick(node.path);
            break;
          }
        }
      }
    },
    [canvasWidth, canvasHeight, onNodeClick]
  );

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
    if (dragNode) {
      dragNode.fx = undefined;
      dragNode.fy = undefined;
      setDragNode(null);
    }
  };

  return (
    <div ref={containerRef} className="graph-view-container" style={{ width: width ?? "100%", height: height ?? "100%", position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        style={{
          width: '100%',
          height: '100%',
          border: '0',
          borderRadius: '0',
          backgroundColor: 'var(--wn-editor-bg)',
          display: 'block',
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      />
    </div>
  );

  function handleMouseLeave() {
    setHoveredNode(null);
    onNodeHover?.(null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'default';
    }
  }
}
