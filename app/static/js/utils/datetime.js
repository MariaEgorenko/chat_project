
export function formatSmartDateTime(isoString) {
  if (!isoString) return "";

  const date = new Date(isoString);
  const now = new Date();

  const startOfDay = (d) => {
    const nd = new Date(d);
    nd.setHours(0, 0, 0, 0);
    return nd;
  };

  const d = startOfDay(date);
  const today = startOfDay(now);

  const diffMs = today - d;
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)); // 0, 1, 2, ...

  if (diffDays === 0) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  if (diffDays === 1) {
    return "Вчера";
  }

  if (diffDays > 1 && diffDays <= 5) {
    const weekdays = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
    return weekdays[date.getDay()];
  }

  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}`;
}