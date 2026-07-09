import React, { useState, useEffect } from 'react';
import { Search, Plus, Filter, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

const MONDAY_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjY4MDkwNzU0NiwiYWFpIjoxMSwidWlkIjo1NTAzNTE4MCwiaWFkIjoiMjAyNi0wNy0wOVQyMDozMzo0MC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6MTQ2OTU4ODksInJnbiI6InVzZTEifQ.FMGgSYZTgw23Y7vZ6pv4lcwL8KF6KcQrDkrIom9ukU8';
const PARENT_BOARD_ID = 18412388048;
const SUBITEM_BOARD_ID = 18412388745;

const MONDAY_API_URL = 'https://api.monday.com/v2';

// Column IDs from skill
const COLUMNS = {
  // Parent item columns
  program: 'dropdown_mm35eypj',
  modality: 'dropdown_mm35m8v0',
  placemat: 'text_mm35qcsk',
  
  // Subitem columns
  tier: 'dropdown_mm355da9',
  role: 'dropdown_mm35mgfm',
  email: 'email_mm35jpv5',
  oracleId: 'text_mm3560gm',
  level: 'text_mm356jcv',
  office: 'text_mm35zm6v',
  region: 'text_mm35kf09',
  isl: 'text_mm35a7rh',
  practice: 'text_mm35d8a1'
};

const PLACEMAT_VALUES = [
  'Early Career',
  'Leadership & Succession',
  'Commercial Capability',
  'People Dev: Mainstream',
  'Digital & Virtual',
  'Orientations & Core'
];

export default function FacilitatorHub() {
  const [sessions, setSessions] = useState([]);
  const [facilitators, setFacilitators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterPlacemat, setFilterPlacemat] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // Modal state
  const [showNewSession, setShowNewSession] = useState(false);
  const [newSessionData, setNewSessionData] = useState({
    name: '',
    program: '',
    placemat: '',
    modality: 'In-Person'
  });
  
  const [showAssignFacilitator, setShowAssignFacilitator] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [facilitatorToAssign, setFacilitatorToAssign] = useState('');
  
  // Fetch data from Monday.com
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch sessions (parent items)
      const sessionQuery = `
        query {
          boards(ids: [${PARENT_BOARD_ID}]) {
            items_page(limit: 500) {
              items {
                id
                name
                group { title }
                column_values(ids: ["${COLUMNS.program}", "${COLUMNS.placemat}", "${COLUMNS.modality}"]) {
                  id
                  text
                }
              }
            }
          }
        }
      `;
      
      const sessionRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_TOKEN
        },
        body: JSON.stringify({ query: sessionQuery })
      });
      
      const sessionData = await sessionRes.json();
      
      if (sessionData.errors) {
        throw new Error(sessionData.errors[0].message);
      }
      
      // Fetch facilitators (subitems)
      const facilitatorQuery = `
        query {
          boards(ids: [${SUBITEM_BOARD_ID}]) {
            items_page(limit: 500) {
              items {
                id
                name
                parent_item { id }
                column_values(ids: ["${COLUMNS.tier}", "${COLUMNS.role}", "${COLUMNS.email}", "${COLUMNS.level}", "${COLUMNS.office}", "${COLUMNS.region}"]) {
                  id
                  text
                }
              }
            }
          }
        }
      `;
      
      const facilRes = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_TOKEN
        },
        body: JSON.stringify({ query: facilitatorQuery })
      });
      
      const facilData = await facilRes.json();
      
      if (facilData.errors) {
        throw new Error(facilData.errors[0].message);
      }
      
      // Parse sessions
      const parsedSessions = sessionData.data?.boards[0]?.items_page?.items?.map(item => {
        const program = item.column_values.find(cv => cv.id === COLUMNS.program)?.text || '';
        const placemat = item.column_values.find(cv => cv.id === COLUMNS.placemat)?.text || '';
        const modality = item.column_values.find(cv => cv.id === COLUMNS.modality)?.text || '';
        
        return {
          id: item.id,
          name: item.name,
          program,
          placemat,
          modality,
          group: item.group?.title || 'Uncategorized'
        };
      }) || [];
      
      // Parse facilitators
      const parsedFacilitators = facilData.data?.boards[0]?.items_page?.items?.map(item => {
        const tier = item.column_values.find(cv => cv.id === COLUMNS.tier)?.text || '';
        const role = item.column_values.find(cv => cv.id === COLUMNS.role)?.text || '';
        const email = item.column_values.find(cv => cv.id === COLUMNS.email)?.text || '';
        const level = item.column_values.find(cv => cv.id === COLUMNS.level)?.text || '';
        const office = item.column_values.find(cv => cv.id === COLUMNS.office)?.text || '';
        const region = item.column_values.find(cv => cv.id === COLUMNS.region)?.text || '';
        
        return {
          id: item.id,
          name: item.name,
          parentItemId: item.parent_item?.id,
          tier,
          role,
          email,
          level,
          office,
          region
        };
      }) || [];
      
      setSessions(parsedSessions);
      setFacilitators(parsedFacilitators);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
  
  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    const matchSearch = session.name.toLowerCase().includes(searchText.toLowerCase()) ||
                       session.program.toLowerCase().includes(searchText.toLowerCase());
    const matchProgram = !filterProgram || session.program === filterProgram;
    const matchPlacemat = !filterPlacemat || session.placemat === filterPlacemat;
    
    return matchSearch && matchProgram && matchPlacemat;
  });
  
  // Get facilitators for a session
  const getFacilitatorsBySession = (sessionId) => {
    return facilitators.filter(f => f.parentItemId === sessionId);
  };
  
  // Get unique values for filters
  const programs = [...new Set(sessions.map(s => s.program))].filter(Boolean).sort();
  const placemats = [...new Set(sessions.map(s => s.placemat))].filter(Boolean).sort();
  const roles = [...new Set(facilitators.map(f => f.role))].filter(Boolean).sort();
  
  const handleCreateSession = async () => {
    if (!newSessionData.name || !newSessionData.program || !newSessionData.placemat) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      const mutation = `
        mutation {
          create_item(
            board_id: ${PARENT_BOARD_ID}
            item_name: "${newSessionData.name}"
            column_values: "{\\"${COLUMNS.program}\\": \\"${newSessionData.program}\\", \\"${COLUMNS.placemat}\\": \\"${newSessionData.placemat}\\", \\"${COLUMNS.modality}\\": \\"${newSessionData.modality}\\"}"
          ) {
            id
          }
        }
      `;
      
      const res = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_TOKEN
        },
        body: JSON.stringify({ query: mutation })
      });
      
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      setShowNewSession(false);
      setNewSessionData({ name: '', program: '', placemat: '', modality: 'In-Person' });
      fetchData();
    } catch (err) {
      alert('Error creating session: ' + err.message);
    }
  };
  
  const handleAssignFacilitator = async () => {
    if (!facilitatorToAssign) {
      alert('Please select a facilitator');
      return;
    }
    
    try {
      const facilitator = facilitators.find(f => f.id === facilitatorToAssign);
      
      const mutation = `
        mutation {
          create_subitem(
            parent_item_id: ${selectedSession.id}
            item_name: "${facilitator.name}"
            column_values: "{\\"${COLUMNS.tier}\\": \\"Primary\\", \\"${COLUMNS.role}\\": \\"${facilitator.role || 'Facilitator'}\\"}"
          ) {
            id
          }
        }
      `;
      
      const res = await fetch(MONDAY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_TOKEN
        },
        body: JSON.stringify({ query: mutation })
      });
      
      const data = await res.json();
      if (data.errors) throw new Error(data.errors[0].message);
      
      setShowAssignFacilitator(false);
      setFacilitatorToAssign('');
      setSelectedSession(null);
      fetchData();
    } catch (err) {
      alert('Error assigning facilitator: ' + err.message);
    }
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">🎯 Facilitator Hub</h1>
              <p className="text-blue-100">Master Facilitator Roster & Session Management</p>
            </div>
            <div className="text-right text-blue-100 text-sm">
              {lastUpdated && <div>Last updated: {lastUpdated}</div>}
              <button
                onClick={fetchData}
                disabled={loading}
                className="mt-2 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
          )}
        </div>
        
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Search className="inline mr-2" size={16} />
                Search Session or Program
              </label>
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Type to search..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            
            {/* Program Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Filter className="inline mr-2" size={16} />
                Program
              </label>
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">All Programs</option>
                {programs.map(prog => (
                  <option key={prog} value={prog}>{prog}</option>
                ))}
              </select>
            </div>
            
            {/* Placemat Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                <Filter className="inline mr-2" size={16} />
                Placemat
              </label>
              <select
                value={filterPlacemat}
                onChange={(e) => setFilterPlacemat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              >
                <option value="">All Placemats</option>
                {placemats.map(pm => (
                  <option key={pm} value={pm}>{pm}</option>
                ))}
              </select>
            </div>
            
            {/* New Session Button */}
            <div className="flex items-end">
              <button
                onClick={() => setShowNewSession(true)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <Plus size={20} />
                New Session
              </button>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            Showing {filteredSessions.length} of {sessions.length} sessions
          </div>
        </div>
        
        {/* Sessions List */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
            Loading sessions...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-600">
            No sessions found matching your filters.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map(session => (
              <div key={session.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 border-l-4 border-blue-600">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{session.name}</h3>
                      <div className="flex gap-3 mt-2 flex-wrap">
                        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {session.program}
                        </span>
                        <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {session.placemat}
                        </span>
                        <span className="bg-gray-100 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full">
                          {session.modality}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedSession(session);
                        setShowAssignFacilitator(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition"
                    >
                      <Plus size={16} />
                      Assign Facilitator
                    </button>
                  </div>
                </div>
                
                {/* Facilitators for this session */}
                <div className="p-4">
                  {getFacilitatorsBySession(session.id).length === 0 ? (
                    <div className="text-gray-500 italic">No facilitators assigned yet</div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {getFacilitatorsBySession(session.id).map(fac => (
                        <div key={fac.id} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                          <div className="font-semibold text-gray-900">{fac.name}</div>
                          {fac.email && <div className="text-xs text-blue-600">{fac.email}</div>}
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {fac.role && <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">{fac.role}</span>}
                            {fac.tier && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">{fac.tier}</span>}
                            {fac.level && <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">{fac.level}</span>}
                          </div>
                          {fac.office && <div className="text-xs text-gray-600 mt-2">📍 {fac.office}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* New Session Modal */}
        {showNewSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Create New Session</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Session Name *</label>
                  <input
                    type="text"
                    value={newSessionData.name}
                    onChange={(e) => setNewSessionData({...newSessionData, name: e.target.value})}
                    placeholder="e.g., Day 1: Introduction"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Program *</label>
                  <select
                    value={newSessionData.program}
                    onChange={(e) => setNewSessionData({...newSessionData, program: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a program...</option>
                    {programs.map(prog => (
                      <option key={prog} value={prog}>{prog}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Placemat *</label>
                  <select
                    value={newSessionData.placemat}
                    onChange={(e) => setNewSessionData({...newSessionData, placemat: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select a placemat...</option>
                    {PLACEMAT_VALUES.map(pm => (
                      <option key={pm} value={pm}>{pm}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Modality</label>
                  <select
                    value={newSessionData.modality}
                    onChange={(e) => setNewSessionData({...newSessionData, modality: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="In-Person">In-Person</option>
                    <option value="Virtual">Virtual</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowNewSession(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Create
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Assign Facilitator Modal */}
        {showAssignFacilitator && selectedSession && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Assign Facilitator</h2>
              <p className="text-gray-600 mb-4">to <strong>{selectedSession.name}</strong></p>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Facilitator</label>
                <select
                  value={facilitatorToAssign}
                  onChange={(e) => setFacilitatorToAssign(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Choose a facilitator...</option>
                  {facilitators
                    .filter(f => !getFacilitatorsBySession(selectedSession.id).find(fac => fac.id === f.id))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(fac => (
                      <option key={fac.id} value={fac.id}>
                        {fac.name} {fac.level && `(${fac.level})`} {fac.office && `- ${fac.office}`}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAssignFacilitator(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssignFacilitator}
                  disabled={!facilitatorToAssign}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
                >
                  <CheckCircle size={18} />
                  Assign
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
