import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useSettingsStore } from '../../store/settingsStore';
import { Input } from '../common/Input';
import { Select } from '../common/Select';
import { Button } from '../common/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../common/Card';
import type { SectionConfig } from '../../types/settings.types';

function SortableSectionRow({ id, children }: { id: string; children: (props: { dragHandleProps: React.HTMLAttributes<HTMLElement> }) => React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

type CalcType = 'interior-detailed' | 'exterior-detailed' | 'simple-pricing' | 'per-room';

const CALC_LABELS: Record<CalcType, string> = {
  'interior-detailed': 'Interior Detailed',
  'exterior-detailed': 'Exterior Detailed',
  'simple-pricing': 'Simple Pricing',
  'per-room': 'Per Room',
};

export function CustomSectionsManager() {
  const { settings, addSection, updateSection, deleteSection } = useSettingsStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [newSection, setNewSection] = useState<Omit<SectionConfig, 'id' | 'order' | 'isDefault'>>({
    name: '',
    calculatorType: 'interior-detailed',
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const allSections = [...settings.pricing.sections].sort((a, b) => a.order - b.order);

  const getSectionsForType = (type: CalcType) =>
    allSections.filter((s) => s.calculatorType === type);

  const handleAddSection = () => {
    if (!newSection.name.trim()) {
      alert('Please enter a section name');
      return;
    }
    addSection({ ...newSection, isDefault: false });
    setNewSection({ name: '', calculatorType: 'interior-detailed' });
    setShowAddForm(false);
  };

  const handleDeleteSection = (section: SectionConfig) => {
    const itemsInSection = settings.pricing.lineItems.filter((item) => item.category === section.id);
    const msg = itemsInSection.length > 0
      ? `This section contains ${itemsInSection.length} line item(s). Deleting it will also remove those items. Continue?`
      : 'Delete this section?';
    if (confirm(msg)) deleteSection(section.id);
  };

  const startEdit = (section: SectionConfig) => {
    setEditingId(section.id);
    setEditingName(section.name);
  };

  const saveEdit = (id: string) => {
    if (editingName.trim()) updateSection(id, { name: editingName.trim() });
    setEditingId(null);
  };

  const handleDragEnd = (type: CalcType) => (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const sections = getSectionsForType(type);
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    reordered.forEach((section, index) => {
      updateSection(section.id, { order: index + 1 });
    });
  };

  const renderSectionList = (type: CalcType) => {
    const sections = getSectionsForType(type);
    if (sections.length === 0) return (
      <p className="text-sm text-gray-400 text-center py-2">No sections yet.</p>
    );

    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd(type)}>
        <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {sections.map((section) => {
              const itemCount = settings.pricing.lineItems.filter((i) => i.category === section.id).length;
              const isEditing = editingId === section.id;

              return (
                <SortableSectionRow key={section.id} id={section.id}>
                  {({ dragHandleProps }) => (
                    <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg bg-gray-50">
                      {/* Drag handle */}
                      <button
                        {...dragHandleProps}
                        className="touch-none cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 text-xl px-1 flex-shrink-0"
                        title="Drag to reorder"
                      >⠿</button>

                      {/* Name (editable) */}
                      <div className="flex-1 min-w-0">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(section.id); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus
                            className="w-full px-2 py-1 text-sm border border-primary-400 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        ) : (
                          <div>
                            <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                            {section.isDefault && (
                              <span className="ml-2 text-xs text-gray-400">(default)</span>
                            )}
                            <span className="ml-2 text-xs text-gray-500">· {itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 flex-shrink-0">
                        {isEditing ? (
                          <>
                            <Button onClick={() => saveEdit(section.id)} variant="primary" size="sm">Save</Button>
                            <Button onClick={() => setEditingId(null)} variant="outline" size="sm">Cancel</Button>
                          </>
                        ) : (
                          <>
                            <Button onClick={() => startEdit(section)} variant="outline" size="sm">Edit</Button>
                            <Button
                              onClick={() => handleDeleteSection(section)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >Delete</Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </SortableSectionRow>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Manage sections for all calculator types. Drag to reorder using the arrows.
        </p>
        <Button onClick={() => setShowAddForm(!showAddForm)} variant="primary">
          {showAddForm ? 'Cancel' : '+ Add Section'}
        </Button>
      </div>

      {/* Add New Section Form */}
      {showAddForm && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle>Add New Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Section Name"
              type="text"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
              placeholder="e.g., Specialty Work"
            />
            <Select
              label="Calculator Type"
              value={newSection.calculatorType}
              onChange={(e) => setNewSection({ ...newSection, calculatorType: e.target.value as CalcType })}
            >
              <option value="interior-detailed">Interior Detailed</option>
              <option value="exterior-detailed">Exterior Detailed</option>
              <option value="simple-pricing">Simple Pricing</option>
              <option value="per-room">Per Room</option>
            </Select>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowAddForm(false)} variant="outline">Cancel</Button>
              <Button onClick={handleAddSection} variant="primary">Add Section</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sections by calculator type */}
      {(['interior-detailed', 'exterior-detailed', 'simple-pricing', 'per-room'] as CalcType[]).map((type) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle>{CALC_LABELS[type]} Sections</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSectionList(type)}
          </CardContent>
        </Card>
      ))}

    </div>
  );
}
