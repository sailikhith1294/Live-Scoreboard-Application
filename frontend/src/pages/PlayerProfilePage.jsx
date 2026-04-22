import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const PlayerProfilePage = () => {
  const { playerId } = useParams();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    api.get(`/matches/players/${playerId}/profile`).then((res) => setProfile(res.data)).catch(() => {});
  }, [playerId]);

  if (!profile) {
    return <div className="surface-panel">Loading profile...</div>;
  }

  return (
    <div className="surface-panel space-y-2">
      <h2>{profile.playerId}</h2>
      <p>Role: {profile.playerRole}</p>
      <p>Availability: {profile.availabilityStatus}</p>
      <p>Career Runs: {profile.careerRuns}</p>
      <p>Career Wickets: {profile.careerWickets}</p>
      <p>Strike Rate: {profile.careerStrikeRate}</p>
      <p>Economy: {profile.careerEconomy}</p>
    </div>
  );
};

export default PlayerProfilePage;
