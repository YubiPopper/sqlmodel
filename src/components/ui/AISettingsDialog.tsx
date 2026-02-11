import React, { useState, useEffect } from 'react';
import { X, Key, Globe, Bot, Eye, EyeOff, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { useModelStore } from '../../store/useModelStore';
import { getAISettings, saveAISettings, clearAISettings, type AIServiceConfig } from '../../services/aiService';

interface AISettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Faster)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Budget)' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
];

const PRESET_PROVIDERS = [
  { value: 'https://api.openai.com/v1', label: 'OpenAI', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { value: 'https://api.anthropic.com/v1', label: 'Anthropic', models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'] },
  { value: 'custom', label: 'Custom Endpoint', models: [] },
];

export const AISettingsDialog: React.FC<AISettingsDialogProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1');
  const [customUrl, setCustomUrl] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');
  const [hasEnvDefault, setHasEnvDefault] = useState(false);
  
  const colorMode = useModelStore(state => state.colorMode);
  const isDark = colorMode === 'dark';

  // Load existing settings
  useEffect(() => {
    if (isOpen) {
      const settings = getAISettings();
      const envKey = import.meta.env.VITE_OPENAI_API_KEY;
      const hasDefault = envKey && envKey !== 'your-openai-api-key-here';
      setHasEnvDefault(!!hasDefault);
      
      if (settings) {
        setApiKey(settings.apiKey);
        
        const provider = PRESET_PROVIDERS.find(p => p.value === settings.baseUrl);
        if (provider) {
          setBaseUrl(settings.baseUrl || 'https://api.openai.com/v1');
        } else {
          setBaseUrl('custom');
          setCustomUrl(settings.baseUrl || '');
        }
        
        setModel(settings.model || 'gpt-4o-mini');
      } else if (hasDefault) {
        // Show placeholder indicating env var is set
        setApiKey('');
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    // Only save if user has entered a custom API key
    if (apiKey) {
      const settings: AIServiceConfig = {
        apiKey,
        baseUrl: baseUrl === 'custom' ? customUrl : baseUrl,
        model,
      };
      saveAISettings(settings);
    }
    onClose();
  };

  const handleClear = () => {
    clearAISettings();
    setApiKey('');
    setBaseUrl('https://api.openai.com/v1');
    setCustomUrl('');
    setModel('gpt-4o-mini');
    setTestResult(null);
    setTestMessage('');
  };

  const handleTest = async () => {
    if (!apiKey) {
      setTestResult('error');
      setTestMessage('Please enter an API key');
      return;
    }

    setIsTesting(true);
    setTestResult(null);
    setTestMessage('');

    try {
      const url = baseUrl === 'custom' ? customUrl : baseUrl;
      const response = await fetch(`${url}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult('success');
        setTestMessage('Connection successful! API key is valid.');
      } else {
        const error = await response.json().catch(() => ({}));
        setTestResult('error');
        setTestMessage(error.error?.message || `Connection failed: ${response.status}`);
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage('Failed to connect. Check your URL and network connection.');
    } finally {
      setIsTesting(false);
    }
  };

  const currentProvider = PRESET_PROVIDERS.find(p => p.value === baseUrl);
  const availableModels = currentProvider?.models.length 
    ? PRESET_MODELS.filter(m => currentProvider.models.includes(m.value))
    : PRESET_MODELS;

  if (!isOpen) return null;

  return (
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
          zIndex: 10000,
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
          maxWidth: '500px',
          background: isDark ? '#0d1117' : '#ffffff',
          border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          borderRadius: '16px',
          boxShadow: isDark 
            ? '0 25px 80px rgba(0, 0, 0, 0.8)' 
            : '0 25px 80px rgba(0, 0, 0, 0.2)',
          zIndex: 10001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: isDark ? '#21262d' : '#f3f4f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#9333ea',
            }}>
              <Bot size={22} />
            </div>
            <div>
              <h2 style={{ 
                margin: 0, 
                fontSize: '18px', 
                fontWeight: 600,
                color: isDark ? '#e6edf3' : '#1f2937',
              }}>
                AI Settings
              </h2>
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: isDark ? '#8b949e' : '#6b7280',
              }}>
                Configure your AI provider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              background: 'transparent',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              color: isDark ? '#8b949e' : '#6b7280',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = isDark ? '#30363d' : '#e5e7eb';
              e.currentTarget.style.color = isDark ? '#e6edf3' : '#1f2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = isDark ? '#8b949e' : '#6b7280';
            }}
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={{ 
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}>
          {/* Provider Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
            }}>
              <Globe size={16} />
              Provider
            </label>
            <select
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setTestResult(null);
                // Auto-select a compatible model
                const provider = PRESET_PROVIDERS.find(p => p.value === e.target.value);
                if (provider?.models.length && !provider.models.includes(model)) {
                  setModel(provider.models[0]);
                }
              }}
              style={{
                padding: '10px 14px',
                background: isDark ? '#0d1117' : 'white',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#1f2937',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {PRESET_PROVIDERS.map(provider => (
                <option key={provider.value} value={provider.value}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom URL */}
          {baseUrl === 'custom' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{
                fontSize: '14px',
                fontWeight: 500,
                color: isDark ? '#e6edf3' : '#374151',
              }}>
                Custom API URL
              </label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-api-endpoint.com/v1"
                style={{
                  padding: '10px 14px',
                  background: isDark ? '#0d1117' : 'white',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          )}

          {/* API Key */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
            }}>
              <Key size={16} />
              API Key
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setTestResult(null);
                }}
                placeholder="sk-..."
                style={{
                  width: '100%',
                  padding: '10px 44px 10px 14px',
                  background: isDark ? '#0d1117' : 'white',
                  border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  color: isDark ? '#e6edf3' : '#1f2937',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: isDark ? '#8b949e' : '#6b7280',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {hasEnvDefault && !apiKey && (
              <div style={{
                padding: '10px 12px',
                background: isDark ? 'rgba(34, 197, 94, 0.1)' : '#dcfce7',
                border: `1px solid ${isDark ? 'rgba(34, 197, 94, 0.3)' : '#86efac'}`,
                borderRadius: '6px',
                fontSize: '12px',
                color: isDark ? '#86efac' : '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <CheckCircle size={14} />
                <span>Using default API key from environment (GPT-4o-Mini)</span>
              </div>
            )}
            <p style={{ 
              margin: 0, 
              fontSize: '12px', 
              color: isDark ? '#8b949e' : '#6b7280',
            }}>
              Your API key is stored locally and never sent to our servers.
            </p>
          </div>

          {/* Model Selection */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: 500,
              color: isDark ? '#e6edf3' : '#374151',
            }}>
              <Bot size={16} />
              Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              style={{
                padding: '10px 14px',
                background: isDark ? '#0d1117' : 'white',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#1f2937',
                fontSize: '14px',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {availableModels.map(m => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Test Result */}
          {testResult && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 14px',
              background: testResult === 'success'
                ? isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4'
                : isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
              border: `1px solid ${testResult === 'success'
                ? isDark ? 'rgba(34, 197, 94, 0.3)' : '#bbf7d0'
                : isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              borderRadius: '8px',
            }}>
              {testResult === 'success' 
                ? <CheckCircle size={18} color="#22c55e" />
                : <AlertCircle size={18} color="#ef4444" />
              }
              <p style={{ 
                margin: 0, 
                fontSize: '13px', 
                color: testResult === 'success'
                  ? isDark ? '#86efac' : '#15803d'
                  : isDark ? '#fca5a5' : '#dc2626',
              }}>
                {testMessage}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderTop: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
          background: isDark ? '#161b22' : '#f9fafb',
        }}>
          <button
            onClick={handleClear}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              background: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
              border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
              borderRadius: '8px',
              color: isDark ? '#fca5a5' : '#dc2626',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            <Trash2 size={16} />
            Clear
          </button>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleTest}
              disabled={isTesting || !apiKey}
              style={{
                padding: '10px 16px',
                background: isDark ? '#21262d' : 'white',
                border: `1px solid ${isDark ? '#30363d' : '#e5e7eb'}`,
                borderRadius: '8px',
                color: isDark ? '#e6edf3' : '#374151',
                fontSize: '14px',
                fontWeight: 500,
                cursor: isTesting || !apiKey ? 'not-allowed' : 'pointer',
                opacity: isTesting || !apiKey ? 0.5 : 1,
              }}
            >
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey}
              style={{
                padding: '10px 20px',
                background: !apiKey
                  ? isDark ? '#30363d' : '#e5e7eb'
                  : 'linear-gradient(135deg, #9333ea 0%, #3b82f6 100%)',
                border: 'none',
                borderRadius: '8px',
                color: !apiKey
                  ? isDark ? '#8b949e' : '#9ca3af'
                  : 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !apiKey ? 'not-allowed' : 'pointer',
              }}
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
