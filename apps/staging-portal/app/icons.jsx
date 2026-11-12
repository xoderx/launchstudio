const paths = {
  rocket:
    "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22 22 0 0 1-4 2Z M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0 M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5",
  grid: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z",
  compass:
    "M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0ZM16.24 7.76l-2.83 5.65-5.65 2.83 2.83-5.65 5.65-2.83Z",
  folder:
    "M20 20H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2Z",
  workflow:
    "M3 3h6v6H3zM15 15h6v6h-6zM6 9v6a3 3 0 0 0 3 3h6M15 3h6v6h-6zM9 6h6",
  check:
    "M9 12l2 2 4-4M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9",
  spark: "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z",
  activity: "M2 12h4l3-9 6 18 3-9h4",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  search: "M21 21l-4.34-4.34M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  arrow: "M7 17 17 7M7 7h10v10",
  chevron: "m9 5 7 7-7 7",
  sun: "M12 3v2M12 19v2M3 12h2M19 12h2M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  lock: "M5 10h14v11H5zM8 10V6a4 4 0 0 1 8 0v4",
  close: "m6 6 12 12M6 18 18 6",
  panel: "M3 3h18v18H3zM9 3v18",
};
export default function Icon({ name, ...props }) {
  return (
    <svg
      width="20"
      height="20"
      className="ui-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d={paths[name] || paths.grid} />
    </svg>
  );
}
