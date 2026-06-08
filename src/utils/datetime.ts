/** Current date/time in India Standard Time (IST). */
export function getIstNow(): { orderDate: string; orderDateTime: string } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '00';

  const orderDate = `${part('year')}-${part('month')}-${part('day')}`;
  const orderDateTime = `${orderDate}T${part('hour')}:${part('minute')}:${part('second')}+05:30`;
  return { orderDate, orderDateTime };
}

export function defaultDeliveryDateIst(daysAhead = 5): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}
