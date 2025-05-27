import React, { useEffect, useRef } from 'react';
import { ControlFlowNode } from '../../types/compiler';

interface ControlFlowVisualizationProps {
  controlFlow: ControlFlowNode | null;
}

const ControlFlowVisualization: React.FC<ControlFlowVisualizationProps> = ({ 
  controlFlow 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  useEffect(() => {
    if (!controlFlow || !svgRef.current) return;
    renderControlFlow(controlFlow);
  }, [controlFlow]);
  
  const renderControlFlow = (rootNode: ControlFlowNode) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    svg.innerHTML = '';
    
    // Define dimensions
    const NODE_WIDTH = 160;
    const NODE_HEIGHT = 60;
    const LEVEL_GAP = 80;
    const HORIZONTAL_GAP = 40;
    
    // Create main group
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', 'translate(50, 50)');
    svg.appendChild(g);
    
    // Add definitions for markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.appendChild(defs);
    
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '8');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    defs.appendChild(marker);
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    path.setAttribute('fill', '#666');
    marker.appendChild(path);
    
    // Layout algorithm
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Helper function to calculate the width needed for a subtree
    const calculateSubtreeWidth = (node: ControlFlowNode): number => {
      if (!node.children || node.children.length === 0) {
        return NODE_WIDTH;
      }
      
      return node.children.reduce((total, child, index) => {
        const childWidth = calculateSubtreeWidth(child);
        return total + childWidth + (index > 0 ? HORIZONTAL_GAP : 0);
      }, 0);
    };
    
    // Helper function to layout the nodes
    const layoutNodes = (
      node: ControlFlowNode, 
      x: number, 
      y: number, 
      level: number
    ): { width: number } => {
      nodes.push({
        id: node.id,
        type: node.type,
        condition: node.condition,
        x,
        y,
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      });
      
      if (!node.children || node.children.length === 0) {
        return { width: NODE_WIDTH };
      }
      
      const childrenWidths = node.children.map(child => calculateSubtreeWidth(child));
      const totalChildrenWidth = childrenWidths.reduce((sum, w) => sum + w, 0) + 
                               (node.children.length - 1) * HORIZONTAL_GAP;
      
      let childX = x - totalChildrenWidth / 2 + childrenWidths[0] / 2;
      
      node.children.forEach((child, i) => {
        links.push({
          source: node.id,
          target: child.id,
          sourceX: x,
          sourceY: y + NODE_HEIGHT / 2,
          targetX: childX,
          targetY: y + NODE_HEIGHT + LEVEL_GAP - NODE_HEIGHT / 2,
          label: node.type === 'IF' && node.children.length > 1 ? 
            (i === 0 ? 'true' : 'false') : 
            undefined
        });
        
        const childResult = layoutNodes(
          child, 
          childX, 
          y + NODE_HEIGHT + LEVEL_GAP, 
          level + 1
        );
        
        if (i < node.children.length - 1) {
          childX += childResult.width + HORIZONTAL_GAP;
        }
      });
      
      return { width: totalChildrenWidth };
    };
    
    // Start the layout
    layoutNodes(rootNode, 0, 0, 0);
    
    // Calculate the bounds
    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;
    
    nodes.forEach(node => {
      minX = Math.min(minX, node.x - NODE_WIDTH / 2);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x + NODE_WIDTH / 2);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT);
    });
    
    // Adjust the view to fit all nodes
    g.setAttribute('transform', `translate(${-minX + 50}, ${-minY + 50})`);
    svg.setAttribute('width', String(maxX - minX + 100));
    svg.setAttribute('height', String(maxY - minY + 100));
    
    // Draw the links first (so they appear behind nodes)
    links.forEach(link => {
      const linkGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.appendChild(linkGroup);
      
      const dx = link.targetX - link.sourceX;
      const dy = link.targetY - link.sourceY;
      const controlPoint1X = link.sourceX;
      const controlPoint1Y = link.sourceY + dy / 2;
      const controlPoint2X = link.targetX;
      const controlPoint2Y = link.sourceY + dy / 2;
      
      const linkElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      linkElement.setAttribute(
        'd', 
        `M ${link.sourceX} ${link.sourceY} C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${link.targetX} ${link.targetY}`
      );
      linkElement.setAttribute('stroke', '#666');
      linkElement.setAttribute('stroke-width', '2');
      linkElement.setAttribute('fill', 'none');
      linkElement.setAttribute('marker-end', 'url(#arrowhead)');
      
      linkGroup.appendChild(linkElement);
      
      if (link.label) {
        const midX = (link.sourceX + link.targetX) / 2;
        const midY = link.sourceY + dy / 2;
        
        const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        labelBg.setAttribute('x', String(midX - 15));
        labelBg.setAttribute('y', String(midY - 10));
        labelBg.setAttribute('width', '30');
        labelBg.setAttribute('height', '20');
        labelBg.setAttribute('rx', '4');
        labelBg.setAttribute('fill', '#fff');
        labelBg.setAttribute('stroke', '#ddd');
        linkGroup.appendChild(labelBg);
        
        const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        label.setAttribute('x', String(midX));
        label.setAttribute('y', String(midY + 5));
        label.setAttribute('text-anchor', 'middle');
        label.setAttribute('font-size', '10px');
        label.textContent = link.label;
        linkGroup.appendChild(label);
      }
    });
    
    // Draw the nodes
    nodes.forEach(node => {
      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.appendChild(nodeGroup);
      
      let nodeShape;
      let fill;
      let stroke;
      let textY;
      
      switch (node.type) {
        case 'ENTRY':
        case 'EXIT':
          nodeShape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
          nodeShape.setAttribute('cx', String(node.x));
          nodeShape.setAttribute('cy', String(node.y + NODE_HEIGHT / 2));
          nodeShape.setAttribute('rx', String(NODE_WIDTH / 2));
          nodeShape.setAttribute('ry', String(NODE_HEIGHT / 2));
          fill = node.type === 'ENTRY' ? '#d1fae5' : '#fee2e2';
          stroke = node.type === 'ENTRY' ? '#059669' : '#dc2626';
          textY = node.y + NODE_HEIGHT / 2;
          break;
          
        case 'IF':
          nodeShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          const diamondPoints = [
            [node.x, node.y],
            [node.x + NODE_WIDTH / 2, node.y + NODE_HEIGHT / 2],
            [node.x, node.y + NODE_HEIGHT],
            [node.x - NODE_WIDTH / 2, node.y + NODE_HEIGHT / 2]
          ];
          nodeShape.setAttribute('points', diamondPoints.map(p => p.join(',')).join(' '));
          fill = '#fef3c7';
          stroke = '#d97706';
          textY = node.y + NODE_HEIGHT / 2 - 10;
          break;
          
        case 'FOR':
          nodeShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          nodeShape.setAttribute('x', String(node.x - NODE_WIDTH / 2));
          nodeShape.setAttribute('y', String(node.y));
          nodeShape.setAttribute('width', String(NODE_WIDTH));
          nodeShape.setAttribute('height', String(NODE_HEIGHT));
          nodeShape.setAttribute('rx', '20');
          nodeShape.setAttribute('ry', '20');
          fill = '#dbeafe';
          stroke = '#3b82f6';
          textY = node.y + NODE_HEIGHT / 2 - 10;
          break;
          
        default:
          nodeShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
          nodeShape.setAttribute('x', String(node.x - NODE_WIDTH / 2));
          nodeShape.setAttribute('y', String(node.y));
          nodeShape.setAttribute('width', String(NODE_WIDTH));
          nodeShape.setAttribute('height', String(NODE_HEIGHT));
          nodeShape.setAttribute('rx', '4');
          nodeShape.setAttribute('ry', '4');
          fill = '#f3f4f6';
          stroke = '#6b7280';
          textY = node.y + NODE_HEIGHT / 2 - 10;
      }
      
      nodeShape.setAttribute('fill', fill);
      nodeShape.setAttribute('stroke', stroke);
      nodeShape.setAttribute('stroke-width', '2');
      nodeGroup.appendChild(nodeShape);
      
      // Create a foreignObject for HTML text content
      const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
      foreignObject.setAttribute('x', String(node.x - NODE_WIDTH / 2));
      foreignObject.setAttribute('y', String(node.y));
      foreignObject.setAttribute('width', String(NODE_WIDTH));
      foreignObject.setAttribute('height', String(NODE_HEIGHT));
      
      const div = document.createElement('div');
      div.style.width = '100%';
      div.style.height = '100%';
      div.style.display = 'flex';
      div.style.flexDirection = 'column';
      div.style.alignItems = 'center';
      div.style.justifyContent = 'center';
      div.style.padding = '4px';
      div.style.textAlign = 'center';
      div.style.fontSize = '12px';
      
      const typeText = document.createElement('div');
      typeText.style.fontWeight = 'bold';
      typeText.textContent = node.type;
      div.appendChild(typeText);
      
      if (node.condition) {
        const conditionText = document.createElement('div');
        conditionText.style.fontSize = '10px';
        conditionText.style.marginTop = '2px';
        conditionText.textContent = node.condition;
        div.appendChild(conditionText);
      }
      
      foreignObject.appendChild(div);
      nodeGroup.appendChild(foreignObject);
    });
  };
  
  if (!controlFlow) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-500">No control flow information available</p>
      </div>
    );
  }
  
  return (
    <div className="h-full overflow-auto p-4">
      <h3 className="text-lg font-medium mb-4">Control Flow</h3>
      
      <div className="bg-white border rounded-lg p-4">
        <div className="overflow-auto">
          <svg 
            ref={svgRef} 
            className="w-full" 
            height="600"
          />
        </div>
      </div>
    </div>
  );
};

export default ControlFlowVisualization;