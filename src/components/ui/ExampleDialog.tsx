import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Database, ShoppingCart, FileText, FolderKanban, Search, Tag } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';

interface ExampleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ExampleMetadata {
  id: string;
  name: string;
  description: string;
  icon: string;
  entityCount: number;
  tableCount: number;
  tags: string[];
  file: string;
}

interface ExampleOption extends ExampleMetadata {
  iconComponent: React.ReactNode;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Database: <Database size={20} />,
  ShoppingCart: <ShoppingCart size={20} />,
  FileText: <FileText size={20} />,
  FolderKanban: <FolderKanban size={20} />,
};

export const ExampleDialog: React.FC<ExampleDialogProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [examples, setExamples] = useState<ExampleOption[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const colorMode = useModelStore(state => state.colorMode);
  const loadModelFromJSON = useModelStore(state => state.loadModelFromJSON);

  const isDark = colorMode === 'dark';

  // Load examples from JSON
  useEffect(() => {
    const loadExamples = async () => {
      try {
        const response = await fetch('/examples/index.json');
        const data = await response.json();
        const examplesWithIcons = data.examples.map((ex: ExampleMetadata) => ({
          ...ex,
          iconComponent: ICON_MAP[ex.icon] || <Database size={20} />,
        }));
        setExamples(examplesWithIcons);
        
        // Extract unique tags
        const tags = new Set<string>();
        data.examples.forEach((ex: ExampleMetadata) => {
          ex.tags.forEach(tag => tags.add(tag));
        });
        setAllTags(Array.from(tags).sort());
        setLoading(false);
      } catch (error) {
        console.error('Failed to load examples:', error);
        setLoading(false);
      }
    };

    if (isOpen) {
      loadExamples();
    }
  }, [isOpen]);

  const filteredExamples = useMemo(() => {
    let filtered = examples;
    
    // Filter by selected tags
    if (selectedTags.length > 0) {
      filtered = filtered.filter(example => 
        selectedTags.some(tag => example.tags.includes(tag))
      );
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(example => 
        example.name.toLowerCase().includes(query) ||
        example.description.toLowerCase().includes(query) ||
        example.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [searchQuery, selectedTags, examples]);

  if (!isOpen) return null;

  const handleLoadExample = async (exampleFile: string) => {
    try {
      const response = await fetch(`/examples/${exampleFile}`);
      const modelData = await response.json();
      loadModelFromJSON(modelData);
      onClose();
    } catch (error) {
      console.error('Failed to load example:', error);
      alert('Failed to load example. Please try again.');
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          zIndex: 9998,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Dialog */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '580px',
          maxHeight: '70vh',
          background: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '10px',
          boxShadow: isDark 
            ? '0 20px 60px rgba(0, 0, 0, 0.8)' 
            : '0 20px 60px rgba(0, 0, 0, 0.2)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 16px',
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: isDark ? '#e6edf3' : '#1f2937',
            }}
          >
            Load Example Model
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: isDark ? '#8b949e' : '#6b7280',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Filters */}
        <div
          style={{
            padding: '12px 16px',
            borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Search Input */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Search
              size={14}
              style={{
                position: 'absolute',
                left: '10px',
                color: isDark ? '#8b949e' : '#9ca3af',
              }}
            />
            <input
              type="text"
              placeholder="Search examples..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 32px',
                fontSize: '12px',
                background: isDark ? '#161b22' : '#f9fafb',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '6px',
                color: isDark ? '#e6edf3' : '#1f2937',
                outline: 'none',
                transition: 'all 0.15s',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = '#3b82f6';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
              }}
            />
          </div>

          {/* Tag Filters */}
          {allTags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
              <Tag size={12} style={{ color: isDark ? '#8b949e' : '#6b7280' }} />
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  style={{
                    background: selectedTags.includes(tag)
                      ? (isDark ? '#3b82f6' : '#3b82f6')
                      : (isDark ? '#21262d' : '#f3f4f6'),
                    color: selectedTags.includes(tag)
                      ? '#ffffff'
                      : (isDark ? '#e6edf3' : '#374151'),
                    border: `1px solid ${selectedTags.includes(tag) 
                      ? '#3b82f6' 
                      : (isDark ? '#30363d' : '#d1d5db')}`,
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedTags.includes(tag)) {
                      e.currentTarget.style.borderColor = '#3b82f6';
                      e.currentTarget.style.background = isDark ? '#1c2128' : '#eff6ff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedTags.includes(tag)) {
                      e.currentTarget.style.borderColor = isDark ? '#30363d' : '#d1d5db';
                      e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
                    }
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            padding: '12px 16px',
            overflowY: 'auto',
            flex: 1,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {loading ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: isDark ? '#8b949e' : '#6b7280',
                  fontSize: '12px',
                }}
              >
                Loading examples...
              </div>
            ) : filteredExamples.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: isDark ? '#8b949e' : '#6b7280',
                  fontSize: '12px',
                }}
              >
                {selectedTags.length > 0 || searchQuery.trim()
                  ? 'No examples match your filters'
                  : 'No examples available'}
              </div>
            ) : (
              filteredExamples.map((example) => (
                <button
                  key={example.id}
                  onClick={() => handleLoadExample(example.file)}
                  style={{
                    background: isDark ? '#161b22' : '#f9fafb',
                    border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#3b82f6';
                    e.currentTarget.style.background = isDark ? '#1c2128' : '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = isDark ? '#30363d' : '#e5e7eb';
                    e.currentTarget.style.background = isDark ? '#161b22' : '#f9fafb';
                  }}
                >
                  <div
                    style={{
                      color: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                      padding: '8px',
                      borderRadius: '6px',
                      flexShrink: 0,
                    }}
                  >
                    {example.iconComponent}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        marginBottom: '4px',
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isDark ? '#e6edf3' : '#1f2937',
                        }}
                      >
                        {example.name}
                      </h3>
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          fontSize: '10px',
                          color: isDark ? '#8b949e' : '#9ca3af',
                          flexShrink: 0,
                        }}
                      >
                        <span>{example.entityCount}E</span>
                        <span>•</span>
                        <span>{example.tableCount}T</span>
                      </div>
                    </div>
                    <p
                      style={{
                        margin: '0 0 6px 0',
                        fontSize: '11px',
                        lineHeight: '1.4',
                        color: isDark ? '#8b949e' : '#6b7280',
                      }}
                    >
                      {example.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        gap: '4px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {example.tags.map((tag) => (
                        <span
                          key={tag}
                          style={{
                            padding: '2px 6px',
                            fontSize: '10px',
                            background: isDark ? 'rgba(59, 130, 246, 0.15)' : '#eff6ff',
                            color: isDark ? '#60a5fa' : '#1d4ed8',
                            borderRadius: '4px',
                            fontWeight: 500,
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '10px 16px',
            borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '8px',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
              borderRadius: '5px',
              color: isDark ? '#e6edf3' : '#374151',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#21262d' : '#f3f4f6';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
};
