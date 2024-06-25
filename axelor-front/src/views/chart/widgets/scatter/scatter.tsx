import { produce } from "immer";
import { useState, useEffect } from "react";

import { PlotData, applyTitles } from "../../builder/utils";
import { ChartProps, ECharts } from "../../builder";

const defaultOption = {
  legend: {
    bottom: 5,
    type: "scroll",
  },
  tooltip: {
    trigger: "axis",
  },
  xAxis: { type: "category", boundaryGap: false },
  yAxis: {
    type: "value",
  },
  series: [],
};

export function Scatter({ data, type, ...rest }: ChartProps) {
  const [options, setOptions] = useState(defaultOption);

  useEffect(() => {
    const { data: series, types, formatter } = PlotData(data);
    setOptions(
      produce((draft: any) => {
        applyTitles(draft, data);
        draft.series = series.map((line: any) => ({
          name: line.key,
          type: "scatter",
          data: line.values.map(({ y }: any) => y),
        }));
        draft.xAxis.data = types;
        draft.legend.data = series.map((x: any) => x.key).filter(x => x);
        draft.tooltip.valueFormatter = formatter;
      }),
    );
  }, [type, data]);

  return <ECharts options={options} data={data} {...(rest as any)} />;
}
