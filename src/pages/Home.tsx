import { Link } from 'react-router-dom';
import { Card, CardContent } from '../components/common/Card';

interface CalculatorOption {
  type: string;
  title: string;
  description: string;
  abbrev: string;
}

const calculatorOptions: CalculatorOption[] = [
  {
    type: 'interior-sqft',
    title: 'Interior Quick Measure',
    description: 'Quick estimate based on house square footage and pricing option',
    abbrev: 'IQ',
  },
  {
    type: 'interior-detailed',
    title: 'Interior Exact Measure',
    description: 'Comprehensive bid with 22 measurements, modifiers, and material costs',
    abbrev: 'IE',
  },
  {
    type: 'exterior-sqft',
    title: 'Exterior Quick Measure',
    description: 'Quick exterior estimate based on house square footage',
    abbrev: 'EQ',
  },
  {
    type: 'exterior-detailed',
    title: 'Exterior Exact Measure',
    description: 'Detailed exterior bid with measurements, modifiers, and materials',
    abbrev: 'EE',
  },
  {
    type: 'per-room',
    title: 'Per Room - Exact Measure',
    description: 'Room-by-room interior bid with individual breakdowns and a grand total',
    abbrev: 'PR',
  },
];

export function Home() {
  return (
    <div>
      <h2 className="font-display text-3xl font-800 uppercase tracking-wide text-navy mb-1">
        Choose a Calculator
      </h2>
      <p className="text-gray-500 mb-6">
        Select the pricing method that best fits your needs
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {calculatorOptions.map((option) => (
          <Link
            key={option.type}
            to={`/app/calculator/${option.type}`}
            className="block transition hover:-translate-y-0.5 active:translate-y-0"
          >
            <Card className="h-full hover:shadow-lg transition-shadow border-l-4 border-l-teal-500">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-navy flex items-center justify-center flex-shrink-0">
                    <span className="font-display text-lg font-800 text-teal-400">{option.abbrev}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-lg font-700 uppercase tracking-wide text-navy mb-1">{option.title}</h3>
                    <p className="text-sm text-gray-500">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 swatch-border bg-white shadow-sm">
        <h3 className="font-display font-700 uppercase tracking-wide text-navy mb-2">Getting Started</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>- Choose a calculator method above</li>
          <li>- Enter customer information and measurements</li>
          <li>- Review the bid calculation</li>
          <li>- Save or export as PDF</li>
        </ul>
      </div>
    </div>
  );
}
