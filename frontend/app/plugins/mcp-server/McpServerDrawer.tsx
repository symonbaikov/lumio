'use client';

import { useState } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField } from '@mui/material';
import { DrawerShell } from '@/app/components/ui/drawer-shell';
import { Copy, Plus, Trash2, Lock } from '@/app/components/icons';
import { tokens } from '@/lib/theme-tokens';
import { useApiKeys } from './useApiKeys';
import toast from 'react-hot-toast';

interface McpServerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const sectionLabelStyle = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.6,
  color: 'var(--text-secondary)',
  mb: 1.5,
};

const codeBlockStyle = {
  background: 'var(--muted, #f4f4f5)',
  borderRadius: tokens.radius.sm,
  p: 1.5,
  fontFamily: 'monospace',
  fontSize: 12,
  color: 'var(--text-primary)',
  overflowX: 'auto' as const,
  whiteSpace: 'pre' as const,
  position: 'relative' as const,
};

function CopyButton({ text }: { text: string }) {
  const handle = () => {
    void navigator.clipboard.writeText(text).then(() => toast.success('Copied'));
  };
  return (
    <button
      type="button"
      onClick={handle}
      style={{
        position: 'absolute',
        top: 6,
        right: 6,
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: 2,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
      }}
      title="Copy"
    >
      <Copy size={14} />
    </button>
  );
}

const MCP_JSON = `{
  "mcpServers": {
    "lumio": {
      "command": "node",
      "args": ["mcp-server/dist/index.js"],
      "env": {
        "LUMIO_BASE_URL": "http://localhost:3001/api/v1",
        "LUMIO_API_KEY": "lum_<your-api-key>",
        "LUMIO_WORKSPACE_ID": "<workspace-uuid>"
      }
    }
  }
}`;

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never used';
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return 'Today';
  if (d === 1) return '1 day ago';
  if (d < 30) return `${d} days ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function McpServerDrawer({ isOpen, onClose }: McpServerDrawerProps) {
  const { keys, loading, newKey, isActive, create, revoke, clearNewKey } = useApiKeys();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [confirmRevokeId, setConfirmRevokeId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!keyName.trim()) return;
    await create(keyName.trim());
    setKeyName('');
    setShowCreateForm(false);
  };

  const handleRevoke = async () => {
    if (!confirmRevokeId) return;
    await revoke(confirmRevokeId);
    setConfirmRevokeId(null);
  };

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title="MCP Server"
        width="md"
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto', flex: 1 }}>

          {/* ── Status ── */}
          <Box>
            <Typography sx={sectionLabelStyle}>Status</Typography>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: tokens.radius.md,
              background: isActive ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.07)',
              border: `1px solid ${isActive ? 'rgba(5,150,105,0.2)' : 'rgba(220,38,38,0.2)'}`,
            }}>
              <Box sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isActive ? '#059669' : '#dc2626',
                flexShrink: 0,
              }} />
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: isActive ? '#059669' : '#dc2626' }}>
                {isActive ? `Connected — ${keys.length} active key${keys.length !== 1 ? 's' : ''}` : 'Not configured — create an API key to get started'}
              </Typography>
            </Box>
          </Box>

          {/* ── Setup ── */}
          <Box>
            <Typography sx={sectionLabelStyle}>Setup</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>

              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                1. Build the MCP server
              </Typography>
              <Box sx={codeBlockStyle}>
                cd mcp-server && npm install && npm run build
                <CopyButton text="cd mcp-server && npm install && npm run build" />
              </Box>

              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                2. Add to <code style={{ background: 'var(--muted)', borderRadius: 3, padding: '1px 4px' }}>.mcp.json</code> in your project root
              </Typography>
              <Box sx={codeBlockStyle}>
                {MCP_JSON}
                <CopyButton text={MCP_JSON} />
              </Box>

              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                3. Restart Claude Code — Lumio tools will appear automatically
              </Typography>
            </Box>
          </Box>

          {/* ── API Keys ── */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography sx={sectionLabelStyle}>API Keys</Typography>
              {!showCreateForm && (
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: tokens.radius.sm,
                    border: 'none',
                    background: 'var(--primary, #059669)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={13} />
                  Create key
                </button>
              )}
            </Box>

            {/* Create form */}
            {showCreateForm && (
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  placeholder="Key name (e.g. Claude Code)"
                  value={keyName}
                  onChange={e => setKeyName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') void handleCreate(); }}
                  autoFocus
                  fullWidth
                  sx={{ fontSize: 13 }}
                />
                <button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={!keyName.trim()}
                  style={{
                    padding: '6px 14px',
                    borderRadius: tokens.radius.sm,
                    border: 'none',
                    background: 'var(--primary, #059669)',
                    color: '#fff',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: keyName.trim() ? 'pointer' : 'not-allowed',
                    opacity: keyName.trim() ? 1 : 0.5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); setKeyName(''); }}
                  style={{
                    padding: '6px 10px',
                    borderRadius: tokens.radius.sm,
                    border: '1px solid var(--border-color, #e5e7eb)',
                    background: 'transparent',
                    fontSize: 12,
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Cancel
                </button>
              </Box>
            )}

            {/* Keys list */}
            {loading ? (
              <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>Loading...</Typography>
            ) : keys.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 3, color: 'var(--text-secondary)' }}>
                <Lock size={24} style={{ opacity: 0.3, marginBottom: 6 }} />
                <Typography sx={{ fontSize: 13 }}>No API keys yet</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {keys.map(key => (
                  <Box
                    key={key.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      p: 1.5,
                      borderRadius: tokens.radius.md,
                      border: '1px solid var(--border-color, #e5e7eb)',
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{key.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        lum_{key.prefix}•••• · {timeAgo(key.lastUsedAt)}
                      </Typography>
                    </Box>
                    <button
                      type="button"
                      onClick={() => setConfirmRevokeId(key.id)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 4,
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Revoke key"
                    >
                      <Trash2 size={15} />
                    </button>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </Box>
      </DrawerShell>

      {/* New key dialog — shown only once */}
      <Dialog open={Boolean(newKey)} onClose={clearNewKey} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Save your API key</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)', mb: 2 }}>
            Copy this key now — it won't be shown again.
          </Typography>
          <Box sx={{ ...codeBlockStyle, wordBreak: 'break-all', whiteSpace: 'normal' }}>
            {newKey?.key}
            <CopyButton text={newKey?.key ?? ''} />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="contained"
            onClick={() => {
              void navigator.clipboard.writeText(newKey?.key ?? '').then(() => {
                toast.success('Copied to clipboard');
                clearNewKey();
              });
            }}
            sx={{ background: 'var(--primary)', '&:hover': { background: 'var(--primary-hover)' } }}
          >
            Copy & Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Revoke confirmation */}
      <Dialog open={Boolean(confirmRevokeId)} onClose={() => setConfirmRevokeId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Revoke API key?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Any agents using this key will lose access immediately.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmRevokeId(null)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => void handleRevoke()}
          >
            Revoke
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
