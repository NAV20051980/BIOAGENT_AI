import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from "recharts";
import { moistureHistory, plantData } from "../data/demo";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="rounded-xl p-2.5 text-xs" style={{ background: "#f7f0de", border: "1px solid #d4b87a", fontFamily: "JetBrains Mono, monospace", boxShadow: "0 4px 12px #c8922a20" }}>
      <div style={{ color: "#a07848" }}>{label}</div>
      <div style={{ color: "#b87a2a" }}>Moisture: {d.moisture}%</div>
      {d.pump && <div style={{ color: "#5a8a3a" }}>● Pump activated</div>}
    </div>
  );
};

const PumpDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload.pump) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill="#5a8a3a20" stroke="#5a8a3a" strokeWidth={2} />
      <circle cx={cx} cy={cy} r={3} fill="#5a8a3a" />
    </g>
  );
};

export default function MoistureChart() {
  return (
    <div className="card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-600 tracking-widest uppercase" style={{ color: "#a07848", fontWeight: 600, letterSpacing: "0.1em" }}>Moisture History</h3>
        <div className="flex items-center gap-3 text-[10px] font-mono" style={{ color: "#a07848" }}>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "#b87a2a" }} /> Soil Moisture</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 inline-block rounded" style={{ background: "#5a8a3a60" }} /> Ideal Zone</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block" style={{ background: "#5a8a3a" }} /> Pump Event</span>
        </div>
      </div>
      <div style={{ height: 180 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={moistureHistory} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0c98a50" vertical={false} />
            <XAxis dataKey="time" tick={{ fill: "#c0a870", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 80]} tick={{ fill: "#c0a870", fontSize: 9, fontFamily: "JetBrains Mono" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceArea y1={plantData.idealMoistureMin} y2={plantData.idealMoistureMax} fill="#5a8a3a12" stroke="#5a8a3a25" />
            <ReferenceLine y={plantData.idealMoistureMin} stroke="#5a8a3a40" strokeDasharray="4 4" label={{ value: `Min ${plantData.idealMoistureMin}%`, fill: "#5a8a3a70", fontSize: 9, fontFamily: "JetBrains Mono" }} />
            <ReferenceLine y={plantData.idealMoistureMax} stroke="#5a8a3a40" strokeDasharray="4 4" label={{ value: `Max ${plantData.idealMoistureMax}%`, fill: "#5a8a3a70", fontSize: 9, fontFamily: "JetBrains Mono" }} />
            <Line type="monotone" dataKey="moisture" stroke="#b87a2a" strokeWidth={2.5} dot={<PumpDot />} activeDot={{ r: 4, fill: "#b87a2a", stroke: "#f7f0de", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
