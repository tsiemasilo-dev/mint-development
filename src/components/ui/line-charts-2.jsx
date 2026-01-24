import React from 'react';
import { Tooltip } from 'recharts';

const ChartContainer = ({ className = '', children }) => (
  <div className={`w-full ${className}`.trim()}>{children}</div>
);

const ChartTooltip = ({ content, cursor }) => (
  <Tooltip content={content} cursor={cursor} />
);

export { ChartContainer, ChartTooltip };
