import React from 'react';

interface PlayerListProps {
    players: string[]; // Array of player names
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
    return (
        <div className='secondaryBlock'>
            <div className="flex items-baseline justify-between mb-3">
                <span>Players</span>
                <p className="text-sm opacity-80">{players.length}</p>
            </div>
            {players.length === 0 ? (
                <p className="opacity-80">No players yet.</p>
            ) : (
                <div className="max-h-64 overflow-y-auto pr-1">
                    <ul>
                        {players.map((player, index) => (
                            <li key={index}>{player}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PlayerList;
