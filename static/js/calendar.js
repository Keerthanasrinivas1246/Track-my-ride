/**
 * Track My Ride - Calendar View Manager
 * Renders an interactive monthly calendar with event pills and preview modals.
 */

class TaskCalendar {
  constructor(events) {
    this.events = events || [];
    this.currentDate = new Date();
    this.container = document.getElementById('calendar-grid');
    this.titleEl = document.getElementById('calendar-month-title');

    this.init();
  }

  init() {
    if (!this.container) return;

    document.getElementById('btn-cal-prev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.render();
    });

    document.getElementById('btn-cal-next').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.render();
    });

    document.getElementById('btn-cal-today').addEventListener('click', () => {
      this.currentDate = new Date();
      this.render();
    });

    this.render();
  }

  render() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    this.titleEl.textContent = `${monthNames[month]} ${year}`;

    // First day of month & days in month
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    let html = `
      <div class="table-responsive">
        <table class="table table-bordered mb-0 calendar-table" style="table-layout: fixed; min-width: 600px;">
          <thead class="bg-light text-center">
            <tr>
              <th style="width: 14.28%;">Sun</th>
              <th style="width: 14.28%;">Mon</th>
              <th style="width: 14.28%;">Tue</th>
              <th style="width: 14.28%;">Wed</th>
              <th style="width: 14.28%;">Thu</th>
              <th style="width: 14.28%;">Fri</th>
              <th style="width: 14.28%;">Sat</th>
            </tr>
          </thead>
          <tbody>
    `;

    let dayCounter = 1;
    let nextMonthCounter = 1;
    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < totalCells; i++) {
      if (i % 7 === 0) html += '<tr>';

      if (i < firstDay) {
        // Prev month cells
        const prevDay = daysInPrevMonth - (firstDay - i - 1);
        html += `<td class="text-muted bg-light opacity-50 p-2" style="height: 105px; vertical-align: top;"><div class="fw-bold small">${prevDay}</div></td>`;
      } else if (dayCounter <= daysInMonth) {
        // Current month cells
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayCounter).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;

        // Match events for this date
        const matchingEvents = this.events.filter(e => e.start.startsWith(dateStr));

        html += `
          <td class="p-2 ${isToday ? 'bg-primary-subtle' : ''}" style="height: 105px; vertical-align: top; position: relative;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="badge rounded-pill ${isToday ? 'bg-primary text-white shadow-sm' : 'bg-body-secondary text-body fw-semibold'}">${dayCounter}</span>
              ${matchingEvents.length > 0 ? `<span class="badge bg-secondary" style="font-size: 0.65rem;">${matchingEvents.length}</span>` : ''}
            </div>
            <div class="calendar-events-container overflow-hidden" style="max-height: 70px;">
        `;

        matchingEvents.forEach(evt => {
          html += `
            <div class="calendar-event-pill text-truncate mb-1 p-1 rounded small"
                 style="background-color: ${evt.color}; color: #fff; font-size: 0.75rem; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.15);"
                 onclick="window.showEventModal(${JSON.stringify(evt).replace(/"/g, '&quot;')})">
              <i class="fas fa-map-pin me-1" style="font-size: 0.65rem;"></i>${evt.title}
            </div>
          `;
        });

        html += `
            </div>
          </td>
        `;
        dayCounter++;
      } else {
        // Next month cells
        html += `<td class="text-muted bg-light opacity-50 p-2" style="height: 105px; vertical-align: top;"><div class="fw-bold small">${nextMonthCounter}</div></td>`;
        nextMonthCounter++;
      }

      if (i % 7 === 6) html += '</tr>';
    }

    html += `
          </tbody>
        </table>
      </div>
    `;

    this.container.innerHTML = html;
  }
}

// Global Modal Opener for Calendar events
window.showEventModal = function(evt) {
  const modalEl = document.getElementById('taskPreviewModal');
  if (!modalEl) return;

  document.getElementById('modal-task-title').textContent = evt.title;
  document.getElementById('modal-task-place').textContent = evt.extendedProps.place_name;
  document.getElementById('modal-task-priority').textContent = evt.extendedProps.priority;
  document.getElementById('modal-task-status').textContent = evt.extendedProps.status;
  document.getElementById('modal-task-link').href = evt.url;

  const bsModal = new bootstrap.Modal(modalEl);
  bsModal.show();
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.calendarEventsData) {
    window.tmrCalendar = new TaskCalendar(window.calendarEventsData);
  }
});
