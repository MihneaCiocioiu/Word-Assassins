import React from 'react';

interface PlayerListProps {
    players: string[]; // Array of player names
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
    return (
        <div className='secondaryBlock'>
            <span>Players in the Game:</span>
            {players.length === 0 ? (
                <p>No players yet.</p>
            ) : (
                <ul>
                    {players.map((player, index) => (
                        <li key={index}>{player}</li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PlayerList;
