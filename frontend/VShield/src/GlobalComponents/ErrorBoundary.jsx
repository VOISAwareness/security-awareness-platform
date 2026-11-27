import { Component } from 'react';

// Catches a page that fails to load or to render, so one broken page shows a
// short message and a Reload button instead of taking the whole app (sidebar
// and top bar included) down to a blank screen. Give it a `key` that changes
// with the route, so moving to another page clears the message.
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('A page failed to load or render', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center justify-center gap-3 px-6 py-20 text-center">
        <p className="text-sm font-bold text-slate-900 dark:text-white">This page could not be loaded.</p>
        <p className="max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Check your connection, then reload. If the app was just updated, reloading fetches the new version.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-1 rounded-lg bg-[#E60000] px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white hover:bg-[#cc0000] cursor-pointer"
        >
          Reload
        </button>
      </div>
    );
  }
}
