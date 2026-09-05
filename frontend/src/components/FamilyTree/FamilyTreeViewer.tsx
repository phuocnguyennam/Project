import { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import type { Member, Relationship } from '@/types';
import { TREE_NODE_WIDTH, TREE_NODE_HEIGHT, TREE_H_GAP, TREE_V_GAP } from '@/utils/constants';

interface FamilyTreeViewerProps {
  members: Member[];
  relationships: Relationship[];
  highlightedMemberId?: string;   // member ID cần highlight (user view)
  selectedMemberId?: string;      // member ID đang được chọn
  onMemberClick?: (member: Member) => void;
  readOnly?: boolean;
}

interface NodePosition {
  member: Member;
  x: number;
  y: number;
  isHighlighted: boolean;
  isSelected: boolean;
}

interface EdgeData {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  isSpouse: boolean;
}

/**
 * Family Tree Visualization sử dụng d3.js.
 * - Top-down layout theo thế hệ (generation)
 * - Vợ/chồng hiển thị cạnh nhau (nối ngang)
 * - Con nối xuống dưới (nối dọc)
 * - Zoom + pan với d3.zoom()
 */
export function FamilyTreeViewer({
  members,
  relationships,
  highlightedMemberId,
  selectedMemberId,
  onMemberClick,
  readOnly: _readOnly = false,
}: FamilyTreeViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Tính toán vị trí (x, y) cho mỗi member node.
   * Layout: theo generation (y), rải đều theo chiều ngang (x).
   */
  const computeLayout = useCallback((): {
    nodes: NodePosition[];
    edges: EdgeData[];
  } => {
    if (members.length === 0) return { nodes: [], edges: [] };

    // Group members by generation
    const byGeneration = new Map<number, Member[]>();
    for (const m of members) {
      const gen = m.generation;
      if (!byGeneration.has(gen)) byGeneration.set(gen, []);
      byGeneration.get(gen)!.push(m);
    }

    const sortedGens = Array.from(byGeneration.keys()).sort((a, b) => a - b);
    const minGen = sortedGens[0];

    const memberPositions = new Map<string, { x: number; y: number }>();
    const nodes: NodePosition[] = [];

    // Assign positions: y theo generation, x rải đều
    for (const gen of sortedGens) {
      const genMembers = byGeneration.get(gen)!;
      const rowY = (gen - minGen) * (TREE_NODE_HEIGHT + TREE_V_GAP);
      const totalWidth = genMembers.length * (TREE_NODE_WIDTH + TREE_H_GAP) - TREE_H_GAP;
      const startX = -totalWidth / 2;

      genMembers.forEach((member, i) => {
        const x = startX + i * (TREE_NODE_WIDTH + TREE_H_GAP);
        memberPositions.set(member.memberId, { x, y: rowY });
        nodes.push({
          member,
          x,
          y: rowY,
          isHighlighted: member.memberId === highlightedMemberId,
          isSelected: member.memberId === selectedMemberId,
        });
      });
    }

    // Build edges from relationships
    const edges: EdgeData[] = [];
    const processedRels = new Set<string>();

    for (const rel of relationships) {
      const key = [rel.memberId1, rel.memberId2].sort().join('-');
      if (processedRels.has(key)) continue;
      processedRels.add(key);

      const pos1 = memberPositions.get(rel.memberId1);
      const pos2 = memberPositions.get(rel.memberId2);
      if (!pos1 || !pos2) continue;

      const isSpouse = rel.type === 'SPOUSE';

      edges.push({
        x1: pos1.x + TREE_NODE_WIDTH / 2,
        y1: pos1.y + TREE_NODE_HEIGHT / 2,
        x2: pos2.x + TREE_NODE_WIDTH / 2,
        y2: pos2.y + TREE_NODE_HEIGHT / 2,
        isSpouse,
      });
    }

    return { nodes, edges };
  }, [members, relationships, highlightedMemberId, selectedMemberId]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 600;

    // Clear previous SVG content
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    // Main group — thứ tự quan trọng: edges trước nodes
    const g = svg.append('g').attr('class', 'tree-container');

    if (members.length === 0) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .text('Chưa có thành viên. Thêm thành viên đầu tiên để bắt đầu.');
      return;
    }

    const { nodes, edges } = computeLayout();

    // Render edges (connections)
    const edgeGroup = g.append('g').attr('class', 'edges');
    edgeGroup
      .selectAll('line')
      .data(edges)
      .join('line')
      .attr('x1', (d) => d.x1)
      .attr('y1', (d) => d.y1)
      .attr('x2', (d) => d.x2)
      .attr('y2', (d) => d.y2)
      .attr('stroke', (d) => (d.isSpouse ? '#ff7875' : '#69c0ff'))
      .attr('stroke-width', (d) => (d.isSpouse ? 2 : 1.5))
      .attr('stroke-dasharray', (d) => (d.isSpouse ? '6,3' : 'none'))
      .attr('stroke-opacity', 0.7);

    // Render nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');
    const nodeGs = nodeGroup
      .selectAll('g.node')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', (d) => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onMemberClick?.(d.member));

    // Node background rect
    nodeGs
      .append('rect')
      .attr('width', TREE_NODE_WIDTH)
      .attr('height', TREE_NODE_HEIGHT)
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('fill', (d) => {
        if (d.isSelected) return '#1677ff';
        if (d.isHighlighted) return '#52c41a';
        return d.member.gender === 'MALE' ? '#e6f4ff' : '#fff0f6';
      })
      .attr('stroke', (d) => {
        if (d.isSelected) return '#1677ff';
        if (d.isHighlighted) return '#52c41a';
        return d.member.gender === 'MALE' ? '#91caff' : '#ffadd2';
      })
      .attr('stroke-width', (d) => (d.isHighlighted || d.isSelected ? 3 : 1.5))
      .attr('filter', (d) =>
        d.isHighlighted ? 'drop-shadow(0 0 8px rgba(82, 196, 26, 0.6))' : 'none'
      );

    // Member name text
    nodeGs
      .append('text')
      .attr('x', TREE_NODE_WIDTH / 2)
      .attr('y', TREE_NODE_HEIGHT / 2 - 6)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 13)
      .attr('font-weight', '600')
      .attr('fill', (d) => (d.isSelected ? 'white' : '#1a1a1a'))
      .text((d) => {
        const name = d.member.name;
        return name.length > 18 ? name.slice(0, 16) + '…' : name;
      });

    // Generation label
    nodeGs
      .append('text')
      .attr('x', TREE_NODE_WIDTH / 2)
      .attr('y', TREE_NODE_HEIGHT / 2 + 14)
      .attr('text-anchor', 'middle')
      .attr('font-size', 11)
      .attr('fill', (d) => (d.isSelected ? 'rgba(255,255,255,0.8)' : '#888'))
      .text((d) => `Đời ${d.member.generation}`);

    // Setup zoom + pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Center the tree initially
    const centerX = width / 2;
    const centerY = 60;
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(centerX, centerY)
    );
  }, [members, relationships, computeLayout, onMemberClick]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '600px',
        border: '1px solid #d9d9d9',
        borderRadius: 8,
        overflow: 'hidden',
        background: '#fafafa',
        position: 'relative',
      }}
    >
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      {members.length === 0 && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: '#aaa',
          }}
        >
          <p>🌳</p>
          <p>Chưa có thành viên nào</p>
        </div>
      )}
    </div>
  );
}
