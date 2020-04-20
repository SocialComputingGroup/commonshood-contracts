/**
 *  Copyright 2020 CommonsHood Team - University of Turin
 * 
 *  This file is part of commonshood-contracts.
 *
 *  commonshood-contracts is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  commonshood-contracts is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *   along with commonshood-contracts.  If not, see <http://www.gnu.org/licenses/>.
 */
import { readdir, readFileSync, writeFileSync } from 'fs';

/**
 * This file should be executed after the contracts compiling in order to extract the
 * ABIs from the compiled json files.
 */
readdir('./build/contracts', function(err, list)
{
  let ABIs = ""
  for (var i = 0; i < list.length; i++) {
      var filename = list[i];
      var data = readFileSync("./build/contracts/" + filename)
      var parsedData = JSON.parse(data)
      ABIs = ABIs + filename + '\n' +`${JSON.stringify(parsedData.abi)}\n\n`
  }
  writeFileSync('abis.txt', ABIs)
})