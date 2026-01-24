import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const UnderwaterPlot = ({ data, color }) => {
    return (
        <div className="chart-container" style={{height: '250px', marginTop:'20px'}}>
            <h4 style={{textAlign:'center', margin:'0 0 10px 0', color:'#7f8c8d', fontSize:'0.9rem'}}>Drawdown Profile</h4>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis unit="%" />
                    <Tooltip 
                        contentStyle={{backgroundColor: '#fff', borderRadius: '8px'}}
                        formatter={(value) => [`${value}%`, 'Drawdown']}
                    />
                    <Area type="monotone" dataKey="value" stroke={color} fill={color} fillOpacity={0.2} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default UnderwaterPlot;