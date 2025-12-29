import React from 'react';

const PriceTable = ({ prices }) => {
  if (!prices || prices.length === 0) return null;
  const headers = Object.keys(prices[0]).filter(k => k !== 'date');

  return (
    <div className="prices-section">
      <h3>Recent Market Data (Last 5 Days)</h3>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              {headers.map(t => <th key={t}>{t}</th>)}
            </tr>
          </thead>
          <tbody>
            {prices.map((row, idx) => (
              <tr key={idx}>
                <td className="date-cell">{row.date}</td>
                {headers.map(t => <td key={t}>${row[t]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PriceTable;