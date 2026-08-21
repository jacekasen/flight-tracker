export type FlightPreview = {
  id: string;
  flightNumber: string;
  dateLabel: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  status: string;
  duration: string;
  aircraft: string;
};

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
