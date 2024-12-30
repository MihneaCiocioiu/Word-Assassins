import React from 'react';

interface PlayerListProps {
    players: string[]; // Array of player names
}

const PlayerList: React.FC<PlayerListProps> = ({ players }) => {
    return (
        <div>
            <h2>Players in the Game:</h2>
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
