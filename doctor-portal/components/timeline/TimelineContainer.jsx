import { usePatient } from '../../context/PatientContext';
import TimelineItem from './TimelineItem';

export default function TimelineContainer() {
  const { timeline } = usePatient();

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-10 text-text-muted">
        <p>No historical records found.</p>
      </div>
    );
  }

  return (
    <div className="relative border-l border-border ml-3 space-y-8 pb-4">
      {timeline.map((item, index) => (
        <TimelineItem key={item.id || index} item={item} />
      ))}
    </div>
  );
}
