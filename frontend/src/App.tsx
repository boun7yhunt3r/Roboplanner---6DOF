import React, { useEffect } from 'react';
import { WorkcellPage } from '@/pages/WorkcellPage';
import { api } from '@/lib/api';
import { useRobotStore } from '@/stores/robotStore';

export default function App() {
  const setRobots = useRobotStore(s=>s.setRobots);
  const selectRobot = useRobotStore(s=>s.selectRobot);
  useEffect(() => {
    api.getRobots().then(robots => {
      setRobots(robots);
      if (robots.length>0) selectRobot(robots[0].id, robots[0]);
    }).catch(console.error);
  }, []);
  return <WorkcellPage />;
}
