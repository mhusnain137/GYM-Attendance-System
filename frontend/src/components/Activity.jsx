import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../App.css';
import './Activity.css';

function Activity() {
  const [events, setEvents] = useState([]);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/api/events');
      setEvents(response.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  const handleClearActivities = async () => {
    if (!window.confirm('Are you sure you want to clear all activity logs?')) return;
    try {
      setIsClearing(true);
      await axios.delete('/api/events');
      setEvents([]);
      fetchEvents();
    } catch (error) {
      console.error('Error clearing activities:', error);
      alert('Failed to clear activities');
    } finally {
      setIsClearing(false);
    }
  };

  const getEventIcon = (type) => {
    switch (type) {
      case 'CAMERA':
        return '📷';
      case 'REGISTRATION':
        return '👤';
      case 'SYSTEM':
        return '⚙';
      case 'SETTINGS':
        return '🔧';
      case 'MEMBERSHIP':
        return '💳';
      case 'ATTENDANCE':
        return '📅';
      default:
        return '📋';
    }
  };

  const getEventColor = (type) => {
    switch (type) {
      case 'CAMERA':
        return '#3b82f6';
      case 'REGISTRATION':
        return '#10b981';
      case 'SYSTEM':
        return '#f59e0b';
      case 'SETTINGS':
        return '#8b5cf6';
      case 'MEMBERSHIP':
        return '#ec4899';
      case 'ATTENDANCE':
        return '#06b6d4';
      default:
        return '#9ca3af';
    }
  };

  return (
    <div className="activity">
      <div className="page-header">
        <div>
          <h1>RECENT ACTIVITY LOG</h1>
          <p className="page-subtitle">Track real-time system events, registrations, and camera logs</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="button button-primary" onClick={fetchEvents}>
            🔄 REFRESH
          </button>
          <button 
            className="button button-danger" 
            onClick={handleClearActivities}
            disabled={isClearing || events.length === 0}
          >
            🗑️ CLEAR ACTIVITIES
          </button>
        </div>
      </div>

      <div className="card activity-log">
        {events.length === 0 ? (
          <div className="no-events">
            <div className="no-events-icon">📋</div>
            <p>No recent activity logs available</p>
          </div>
        ) : (
          <div className="events-list">
            {events.map((event, index) => (
              <div key={index} className="event-item">
                <div 
                  className="event-icon"
                  style={{ backgroundColor: getEventColor(event.type) }}
                >
                  {getEventIcon(event.type)}
                </div>
                <div className="event-content">
                  <div className="event-header">
                    <span className="event-type">{event.type}</span>
                    <span className="event-time">{event.timestamp}</span>
                  </div>
                  <div className="event-message">{event.message}</div>
                  {event.data && Object.keys(event.data).length > 0 && (
                    <div className="event-data">
                      {Object.entries(event.data).map(([key, value]) => (
                        <span key={key} className="data-item">
                          {key}: {value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Activity;