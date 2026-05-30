import type { CollaborationUser } from '../../../collaboration/types';

interface PresenceAvatarsProps {
  users: CollaborationUser[];
  selfColor: string;
  selfName: string;
  onClick: () => void;
}

const MAX_VISIBLE = 3;

export const PresenceAvatars = ({ users, selfColor, selfName, onClick }: PresenceAvatarsProps) => {
  const allUsers = [
    { id: 'self', name: selfName, color: selfColor, selectedId: null } as CollaborationUser,
    ...users,
  ];
  const visible = allUsers.slice(0, MAX_VISIBLE);
  const overflow = allUsers.length - MAX_VISIBLE;

  return (
    <button
      onClick={onClick}
      title="Collaboration — click to manage"
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px 2px',
        gap: '0px',
      }}
    >
      {visible.map((u, i) => (
        <div
          key={u.id}
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: u.color,
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            color: '#fff',
            marginLeft: i === 0 ? 0 : '-6px',
            zIndex: MAX_VISIBLE - i,
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: '#6b7280',
            border: '2px solid white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '9px',
            fontWeight: 700,
            color: '#fff',
            marginLeft: '-6px',
            zIndex: 0,
            position: 'relative',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
          }}
        >
          +{overflow}
        </div>
      )}
    </button>
  );
};
