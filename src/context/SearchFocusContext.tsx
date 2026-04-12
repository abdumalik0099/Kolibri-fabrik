import { createContext, useContext, useState, type PropsWithChildren } from "react";

type SearchFocusContextValue = {
  isSearchFocused: boolean;
  setSearchFocused: (value: boolean) => void;
};

const SearchFocusContext = createContext<SearchFocusContextValue>({
  isSearchFocused: false,
  setSearchFocused: () => {},
});

export function SearchFocusProvider({ children }: PropsWithChildren) {
  const [isSearchFocused, setSearchFocused] = useState(false);

  return (
    <SearchFocusContext.Provider value={{ isSearchFocused, setSearchFocused }}>
      {children}
    </SearchFocusContext.Provider>
  );
}

export function useSearchFocus() {
  return useContext(SearchFocusContext);
}
