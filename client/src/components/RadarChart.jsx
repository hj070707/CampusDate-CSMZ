/**
 * 纯 SVG 雷达图组件 — 无第三方依赖
 *
 * Props:
 *   dataA: { values: 4.2, personality: 3.5, ... }    必填
 *   dataB: { values: 3.8, ... }                       可选（匹配结果页叠加对方）
 *   labelA: '你'                                      默认 '你'
 *   labelB: 'TA'                                      默认 'TA'
 *   size:   280                                       SVG 尺寸 px
 */
const DIMENSIONS = ['values', 'personality', 'lifestyle', 'communication', 'future'];

const DIM_LABELS = {
  values: '价值观',
  personality: '性格',
  lifestyle: '生活方式',
  communication: '情感沟通',
  future: '未来规划'
};

export default function RadarChart({ dataA, dataB, labelA = '你', labelB = 'TA', size = 280 }) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const levels = 5; // 5 圈刻度
  const angleStep = (2 * Math.PI) / DIMENSIONS.length;
  const startAngle = -Math.PI / 2; // 顶部起

  // 计算某个维度在指定分数下的坐标
  function getPoint(dim, score, maxScore = 5) {
    const idx = DIMENSIONS.indexOf(dim);
    const angle = startAngle + idx * angleStep;
    const r = (Math.min(score, maxScore) / maxScore) * radius;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    };
  }

  // 构建多边形路径
  function buildPath(data) {
    const points = DIMENSIONS.map(dim => {
      const p = getPoint(dim, Number(data?.[dim] || 0));
      return `${p.x},${p.y}`;
    });
    return `M ${points.join(' L ')} Z`;
  }

  // 每个维度的标签位置（在外圈外侧）
  const labelPoints = DIMENSIONS.map((dim, idx) => {
    const angle = startAngle + idx * angleStep;
    const r = radius + 22;
    return {
      dim,
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
      label: DIM_LABELS[dim] || dim
    };
  });

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* 背景网格 — 同心多边形 */}
        {Array.from({ length: levels }, (_, i) => {
          const r = radius * ((i + 1) / levels);
          const pts = DIMENSIONS.map((dim, idx) => {
            const angle = startAngle + idx * angleStep;
            return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
          }).join(' ');
          return (
            <polygon
              key={'grid' + i}
              points={pts}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={i === levels - 1 ? 1.5 : 1}
              opacity={0.7}
            />
          );
        })}

        {/* 轴线 — 从中心到每个顶点 */}
        {DIMENSIONS.map((dim, idx) => {
          const p = getPoint(dim, 5);
          return (
            <line
              key={'axis' + idx}
              x1={cx} y1={cy}
              x2={p.x} y2={p.y}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          );
        })}

        {/* 刻度数字 */}
        {Array.from({ length: levels }, (_, i) => {
          const r = radius * ((i + 1) / levels);
          return (
            <text
              key={'tick' + i}
              x={cx + 4}
              y={cy - r + 4}
              fontSize={9}
              fill="#d1d5db"
            >
              {i + 1}
            </text>
          );
        })}

        {/* 数据 B（对方）— 先画在下层 */}
        {dataB && (
          <>
            <path
              d={buildPath(dataB)}
              fill="rgba(99, 102, 241, 0.12)"
              stroke="rgb(99, 102, 241)"
              strokeWidth={2}
              strokeLinejoin="round"
            />
            {DIMENSIONS.map((dim, idx) => {
              const p = getPoint(dim, Number(dataB?.[dim] || 0));
              return (
                <circle
                  key={'dotB' + idx}
                  cx={p.x} cy={p.y} r={3.5}
                  fill="rgb(99, 102, 241)"
                  stroke="white"
                  strokeWidth={1.5}
                />
              );
            })}
          </>
        )}

        {/* 数据 A（自己）— 上层 */}
        <path
          d={buildPath(dataA)}
          fill="rgba(244, 63, 94, 0.15)"
          stroke="rgb(244, 63, 94)"
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {DIMENSIONS.map((dim, idx) => {
          const p = getPoint(dim, Number(dataA?.[dim] || 0));
          return (
            <circle
              key={'dotA' + idx}
              cx={p.x} cy={p.y} r={3.5}
              fill="rgb(244, 63, 94)"
              stroke="white"
              strokeWidth={1.5}
            />
          );
        })}

        {/* 维度标签 */}
        {labelPoints.map((lp, idx) => (
          <text
            key={'label' + idx}
            x={lp.x}
            y={lp.y}
            fontSize={12}
            fontWeight={600}
            fill="#4b5563"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {lp.label}
          </text>
        ))}
      </svg>

      {/* 图例 */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm bg-rose-500 opacity-70" />
          <span className="text-xs text-gray-600 font-medium">{labelA}</span>
        </div>
        {dataB && (
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500 opacity-70" />
            <span className="text-xs text-gray-600 font-medium">{labelB}</span>
          </div>
        )}
      </div>
    </div>
  );
}
