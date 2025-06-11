import React, { useState } from "react";

const MultiSelect = ({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) => {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleOptionClick = (option: string) => {
    let newSelectedOptions = selectedOptions.includes(option)
      ? selectedOptions.filter((item) => item !== option)
      : [...selectedOptions, option];
    setSelectedOptions(newSelectedOptions);
    onChange(newSelectedOptions);
  };

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-64 relative">
      <div
        className="border border-gray-300 rounded p-2 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>
          {selectedOptions.length > 0
            ? selectedOptions.join(", ")
            : "Select options"}
        </span>
        <span>{isOpen ? "▲" : "▼"}</span>
      </div>
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-300 rounded shadow-md z-10 w-full">
          <input
            type="text"
            placeholder="Search"
            className="w-full p-2 border-b border-gray-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <ul>
            {filteredOptions.map((option: string) => (
              <li
                key={option}
                className={`p-2 hover:bg-gray-100 cursor-pointer ${
                  selectedOptions.includes(option) ? "bg-gray-100" : ""
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={selectedOptions.includes(option)}
                    onChange={() => handleOptionClick(option)}
                  />
                  {option}
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
export default MultiSelect;
