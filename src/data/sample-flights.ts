import type { FlightPreview } from '@/types/flight';

export type { FlightPreview };

export const sampleFlights: FlightPreview[] = [
  {
    id: 'sample-sfo-jfk',
    flightNumber: 'UA 120',
    dateLabel: 'FRI, AUG 28',
    origin: 'SFO',
    destination: 'JFK',
    departureTime: '8:15 AM',
    arrivalTime: '4:47 PM',
    status: 'ON TIME',
    duration: '5h 32m',
    aircraft: 'Boeing 777-200',
  },
];
