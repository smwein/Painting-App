import { Link } from 'react-router-dom';
import { Card, CardContent, CardTitle } from '../components/common/Card';

interface CalculatorOption {
  type: string;
  title: string;
  description: string;
  icon: string;
}

const calculatorOptions: CalculatorOption[] = [
  {
    type: 'interior-sqft',
    title: 'Interior Quick Measure',
    description: 'Quick estimate based on house square footage and pricing option',
    icon: '🏠',
  },
  {
    type: 'interior-detailed',
    title: 'Interior Exact Measure',
    description: 'Comprehensive bid with 22 measurements, modifiers, and material costs',
    icon: '📐',
  },
  {
    type: 'exterior-sqft',
    title: 'Exterior Quick Measure',
    description: 'Quick exterior estimate based on house square footage',
    icon: '🏡',
  },
  {
    type: 'exterior-detailed',
    title: 'Exterior Exact Measure',
    description: 'Detailed exterior bid with measurements, modifiers, and materials',
    icon: '📏',
  },
  {
    type: 'per-room',
    title: 'Per Room - Exact Measure',
    description: 'Room-by-room interior bid with individual breakdowns and a grand total',
    icon: '🛋️',
  },
];

export function Home() {
  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Choose a Calculator
      </h2>
      <p className="text-gray-600 mb-6">
        Select the pricing method that best fits your needs
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {calculatorOptions.map((option) => (
          <Link
            key={option.type}
            to={`/calculator/${option.type}`}
            className="block transform transition hover:scale-105 active:scale-95"
          >
            <Card className="h-full hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="text-4xl flex-shrink-0">{option.icon}</div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="mb-2">{option.title}</CardTitle>
                    <p className="text-sm text-gray-600">{option.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">Getting Started</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Choose a calculator method above</li>
          <li>• Enter customer information and measurements</li>
          <li>• Review the bid calculation</li>
          <li>• Save or export as PDF</li>
        </ul>
      </div>
    </div>
  );
}
