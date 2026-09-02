import { Bar } from "react-chartjs-2";
import "chart.js/auto";
import { useTheme } from "../context/ThemeContext";

interface Props {
  dataPoints: number[];
}

const ChartMonthlyOrders: React.FC<Props> = ({ dataPoints }) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (!Array.isArray(dataPoints) || dataPoints.length === 0) {
    return (
      <p style={{ color: isDark ? "rgba(255,255,255,0.25)" : "rgba(15,23,42,0.35)", fontSize: "13px", fontFamily: "'DM Sans', sans-serif" }}>
        Aún no hay despachos registrados este mes.
      </p>
    );
  }

  const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const dataSafe =
    dataPoints.length === 31 ? dataPoints : [...dataPoints, ...Array(Math.max(0, 31 - dataPoints.length)).fill(0)];

  const data = {
    labels,
    datasets: [
      {
        label: "Despachos",
        data: dataSafe,
        backgroundColor: "rgba(99,102,241,0.45)",
        hoverBackgroundColor: "rgba(99,102,241,0.8)",
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false as const,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "rgba(8,12,20,0.95)" : "rgba(255,255,255,0.98)",
        titleColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(15,23,42,0.45)",
        bodyColor: isDark ? "#A5B4FC" : "#4F46E5",
        padding: 10,
        cornerRadius: 10,
        borderColor: "rgba(99,102,241,0.25)",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: {
          color: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.45)",
          font: { size: 10, family: "'DM Sans', sans-serif" },
        },
      },
      y: {
        beginAtZero: true,
        border: { display: false },
        ticks: {
          stepSize: 1,
          color: isDark ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.45)",
          font: { size: 10, family: "'DM Sans', sans-serif" },
        },
        grid: { color: isDark ? "rgba(255,255,255,0.04)" : "rgba(15,23,42,0.06)" },
      },
    },
  };

  return (
    <div style={{ height: 220 }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export default ChartMonthlyOrders;