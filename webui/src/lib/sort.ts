export function sortActiveFirstByIdDesc<T extends { id: number }>(
  items: T[],
  isActive: (item: T) => boolean,
) {
  return [
    ...items.filter(isActive).sort((a, b) => b.id - a.id),
    ...items.filter((item) => !isActive(item)).sort((a, b) => b.id - a.id),
  ];
}
