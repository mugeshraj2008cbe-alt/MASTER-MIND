'use client';
import React, { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { Camera, Sparkles, User as UserIcon, LogOut, Plus, FolderKanban } from 'lucide-react';
import { Project } from '@/lib/api';

interface NavbarProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
  onCreateProject: (name: string) => void;
  onOpenAuth: () => void;
}

export default function Navbar({
  projects,
  activeProject,
  onSelectProject,
  onCreateProject,
  onOpenAuth,
}: NavbarProps) {
  const { user, logout } = useAuth();
  const [showNewModal, setShowNewModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      setNewProjectName('');
      setShowNewModal(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-[#232532] bg-[#090a0f]/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#d4af37] via-[#94761e] to-[#45360a] p-[1px] shadow-lg shadow-[#d4af37]/15">
            <div className="w-full h-full bg-[#0d0e14] rounded-xl flex items-center justify-center">
              <Camera className="w-5 h-5 text-[#d4af37]" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif tracking-widest text-lg font-bold text-white uppercase">
                MASTER MIND
              </span>
              <span className="text-[10px] tracking-widest uppercase bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30 px-2 py-0.5 rounded-full font-medium">
                STUDIO PRO
              </span>
            </div>
            <p className="text-[11px] text-gray-400 tracking-wide font-sans">
              AI-Powered Reference-Based Photo Colorist
            </p>
          </div>
        </div>

        {/* Center: Active Project Selector */}
        {user && (
          <div className="hidden md:flex items-center gap-2 bg-[#12131b] border border-[#232532] rounded-lg px-3 py-1.5">
            <FolderKanban className="w-4 h-4 text-[#d4af37]" />
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                const found = projects.find((p) => p.id === Number(e.target.value));
                if (found) onSelectProject(found);
              }}
              className="bg-transparent text-sm text-gray-200 outline-none cursor-pointer pr-2"
            >
              {projects.length === 0 && <option value="">No Projects Yet</option>}
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-[#12131b] text-gray-200">
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setShowNewModal(true)}
              className="ml-2 flex items-center gap-1 text-xs text-[#d4af37] hover:text-[#f3e5ab] transition-colors font-medium border-l border-[#262837] pl-3"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>
        )}

        {/* Right side: Status and Auth */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400 bg-[#101117] border border-[#212330] px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Local CV &amp; LAB Transfer Active</span>
          </div>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-300">
                <div className="w-8 h-8 rounded-full bg-[#1b1d28] border border-[#d4af37]/40 flex items-center justify-center text-xs font-bold text-[#d4af37]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="hidden sm:inline font-medium">{user.username}</span>
              </div>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-[#1a1c26] transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-[#d4af37] to-[#b38f2a] text-black font-semibold text-xs tracking-wider uppercase hover:opacity-95 transition-all shadow-md shadow-[#d4af37]/20"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </header>

      {/* New Project Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#101117] border border-[#2a2d3d] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-serif font-bold text-white mb-2">Create New Project</h3>
            <p className="text-xs text-gray-400 mb-4">
              Enter a title for your photo grading session.
            </p>
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="e.g., Vogue Editorial shoot, Tokyo Night Street"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                className="w-full px-4 py-2.5 rounded-lg bg-[#181924] border border-[#2b2e40] text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37]"
              />
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-400 hover:text-white hover:bg-[#1b1d28] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#d4af37] text-black hover:bg-[#f3e5ab] disabled:opacity-50 transition-colors"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
