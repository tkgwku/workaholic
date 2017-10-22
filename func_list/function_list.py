# coding: utf-8
import os
import re

indir = os.path.dirname(os.path.abspath(os.path.dirname(__name__)))

res = ""
for filename in os.listdir(indir):
	if filename == "function_list.html":
		continue
	if not os.path.isdir(indir + '/' + filename):
		if ".js" == filename[-3:] or ".html" == filename[-5:]:
			res += "<h3>"+filename+"</h3>"
			res += "<br>"
			res += "<table>"
			f = open(indir + '/' + filename,'r', encoding="utf-8")
			content = f.read()
			f.close()

			count = 0

			lines = content.split('\n')
			for line in lines:
				count += 1
				m = re.match(r"function\s*(.+)(\(.*\))", line)
				m2 = re.match(r"([^\s]+)\s*\=\s*function\s*(\(.*\))", line)
				if m2:
					m = m2
				if m:
					res += "<tr><td>[<span style='color:#f46842'>"+str(count)+"</span>]</td><td><span style='color:#c47719'>function</span> "+m.group(1)+"<span style='color:#777'>"+m.group(2)+"</span></td></tr>"
			res += "</table><br>"
print(res)