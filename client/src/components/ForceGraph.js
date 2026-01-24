import React, { useEffect, useRef, useState } from 'react';

const ForceGraph = ({ correlationData }) => {
    const svgRef = useRef(null);
    const [nodes, setNodes] = useState([]);
    const [links, setLinks] = useState([]);

    useEffect(() => {
        if (!correlationData) return;

        const { tickers, matrix } = correlationData;
        const n = tickers.length;
        
        // Initialize Nodes in a circle
        const initialNodes = tickers.map((t, i) => ({
            id: t,
            x: 400 + 200 * Math.cos(2 * Math.PI * i / n),
            y: 300 + 200 * Math.sin(2 * Math.PI * i / n),
            vx: 0, vy: 0
        }));

        // Create Links for high correlations (> 0.25)
        const initialLinks = [];
        for (let i = 0; i < n; i++) {
            for (let j = i + 1; j < n; j++) {
                const val = matrix[i][j];
                if (Math.abs(val) > 0.25) {
                    initialLinks.push({ source: i, target: j, value: val });
                }
            }
        }

        setNodes(initialNodes);
        setLinks(initialLinks);

        // Simple Simulation Loop
        let iter = 0;
        let animationFrameId;
        
        const runSim = () => {
            if (iter > 150) return; // Stop after 150 frames
            
            setNodes(prevNodes => {
                const nextNodes = prevNodes.map(n => ({ ...n }));
                
                // 1. Repulsion (Coulomb)
                for (let i = 0; i < n; i++) {
                    for (let j = i + 1; j < n; j++) {
                        const dx = nextNodes[i].x - nextNodes[j].x;
                        const dy = nextNodes[i].y - nextNodes[j].y;
                        const distSq = dx*dx + dy*dy || 1;
                        const force = 5000 / distSq;
                        const fx = (dx / Math.sqrt(distSq)) * force;
                        const fy = (dy / Math.sqrt(distSq)) * force;
                        nextNodes[i].vx += fx; nextNodes[i].vy += fy;
                        nextNodes[j].vx -= fx; nextNodes[j].vy -= fy;
                    }
                }

                // 2. Attraction (Spring) along links
                initialLinks.forEach(link => {
                    const s = nextNodes[link.source];
                    const t = nextNodes[link.target];
                    const dx = t.x - s.x;
                    const dy = t.y - s.y;
                    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
                    // Stronger correlation = shorter spring
                    const targetDist = (1 - Math.abs(link.value)) * 200; 
                    const force = (dist - targetDist) * 0.05;
                    const fx = (dx / dist) * force;
                    const fy = (dy / dist) * force;
                    s.vx += fx; s.vy += fy;
                    t.vx -= fx; t.vy -= fy;
                });

                // 3. Center Gravity
                nextNodes.forEach(node => {
                    node.vx += (400 - node.x) * 0.01;
                    node.vy += (300 - node.y) * 0.01;
                    // Dampening
                    node.vx *= 0.6;
                    node.vy *= 0.6;
                    node.x += node.vx;
                    node.y += node.vy;
                });

                return nextNodes;
            });
            iter++;
            animationFrameId = requestAnimationFrame(runSim);
        };
        runSim();

        return () => cancelAnimationFrame(animationFrameId);
    }, [correlationData]);

    return (
        <div className="card" style={{textAlign:'center', background:'white', padding:'20px', borderRadius:'12px', boxShadow:'0 4px 6px rgba(0,0,0,0.05)'}}>
            <h3 style={{color:'#2c3e50', marginBottom:'15px'}}>Asset Correlation Network</h3>
            <svg ref={svgRef} width="100%" height="400" viewBox="0 0 800 600" style={{background:'#f8f9fa', borderRadius:'8px'}}>
                {links.map((link, i) => {
                    const s = nodes[link.source];
                    const t = nodes[link.target];
                    if(!s || !t) return null;
                    const opacity = Math.abs(link.value);
                    const color = link.value > 0 ? "#2ecc71" : "#e74c3c";
                    return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke={color} strokeWidth={opacity * 3} strokeOpacity={opacity * 0.6} />;
                })}
                {nodes.map((node, i) => (
                    <g key={i} transform={`translate(${node.x},${node.y})`}>
                        <circle r="20" fill="white" stroke="#2c3e50" strokeWidth="2" />
                        <text dy="5" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#2c3e50">{node.id}</text>
                    </g>
                ))}
            </svg>
            <p style={{fontSize:'0.8rem', color:'#7f8c8d', marginTop:'10px'}}>Thicker lines = Stronger correlation. Green = Positive, Red = Negative.</p>
        </div>
    );
};

export default ForceGraph;